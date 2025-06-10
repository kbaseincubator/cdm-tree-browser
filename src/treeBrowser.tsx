import React, { useState, FC, useEffect, useCallback } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { Tree, NodeRendererProps } from 'react-arborist';
import { Container, IconButton, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDown,
  faAngleRight,
  faRightToBracket
} from '@fortawesome/free-solid-svg-icons';
import {
  parseKernelOutputJSON,
  queryKernel,
  useSessionContext
} from './kernelCommunication';

/**
 * Core Types for Tree Browser
 */

/**
 * Represents a single node in the tree structure
 * @template T - Union type of supported node types (e.g., 'database' | 'table')
 */
type TreeNodeType<T extends string = string> = {
  /** Unique identifier for the node */
  id: string;
  /** Display name shown in the tree */
  name: string;
  /** Type of the node, used to determine child loading behavior */
  type: T;
  /** Whether this node contains actionable content */
  hasContent?: boolean;
  /** Child nodes - undefined means not loaded, empty array means no children */
  children?: TreeNodeType[];
};

/**
 * Interface for data providers that supply tree data
 * Each provider represents a different data source (e.g., CDM database, file system, etc.)
 * @template T - Union type of node types this provider supports
 */
interface ITreeDataProvider<T extends string = string> {
  /** Unique name for this provider */
  name: string;
  /** Array of node types this provider can handle */
  supportedNodeTypes: T[];
  /** Function to fetch the root-level nodes for this provider */
  fetchRootNodes: (sessionContext: SessionContext) => Promise<TreeNodeType[]>;
  /** Map of node type to child fetching function */
  fetchChildNodes: {
    [K in T]?: (
      node: TreeNodeType<K>,
      sessionContext: SessionContext
    ) => Promise<TreeNodeType<T>[]>;
  };
}

/** Function type for updating nodes in the tree */
type TreeNodeMutator = (id: string, updatedNode: TreeNodeType) => void;

/** Props for the TreeNodeRenderer component */
interface ITreeNodeRendererProps extends NodeRendererProps<TreeNodeType> {
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
}

/**
 * Tree Query Manager Configuration
 *
 * TO ADD A NEW DATA PROVIDER:
 *
 * 1. Create a new provider object implementing ITreeDataProvider:
 *    {
 *      name: 'yourProviderName',           // Unique identifier
 *      supportedNodeTypes: ['type1', 'type2'], // Node types you support
 *      fetchRootNodes: async (sessionContext) => {
 *        // Return Promise<TreeNodeType[]> for top-level nodes
 *        // Example: fetch data from API, transform into TreeNodeType format
 *      },
 *      fetchChildNodes: {
 *        type1: async (node, sessionContext) => {
 *          // Return Promise<TreeNodeType[]> for children of 'type1' nodes
 *        },
 *        type2: async (node, sessionContext) => {
 *          // Return Promise<TreeNodeType[]> for children of 'type2' nodes
 *          // Return empty array [] if node type has no children
 *        }
 *      }
 *    }
 *
 * 2. Add your provider to the array passed to createTreeQueryManager()
 *
 * 3. The tree will automatically:
 *    - Create a root node for your provider
 *    - Call fetchRootNodes when the tree initializes
 *    - Call appropriate fetchChildNodes functions when nodes expand
 *
 * EXAMPLE: File system provider (not a real potential example, but just proof it works with any async funcs)
 *    {
 *      name: 'fileSystem',
 *      supportedNodeTypes: ['directory', 'file'],
 *      fetchRootNodes: async (sessionContext) => [
 *        { id: 'root', name: 'Root Directory', type: 'directory' }
 *      ],
 *      fetchChildNodes: {
 *        directory: async (node, sessionContext) => {
 *          // Fetch directory contents and return as TreeNodeType[]
 *        },
 *        file: async () => [] // Files have no children
 *      }
 *    }
 */
const treeQueryManager = createTreeQueryManager([
  // CDM Database Provider - fetches database and table structure
  {
    name: 'cdmDB',
    supportedNodeTypes: ['database', 'table'],
    fetchRootNodes: async (sessionContext: SessionContext) => {
      const output = await queryKernel(
        'get_db_structure(with_schema=False,return_json=True)',
        sessionContext
      );
      const databaseStructure =
        parseKernelOutputJSON<Record<string, string[]>>(output);

      if (!databaseStructure) {
        return [];
      }

      return Object.entries(databaseStructure).map(
        ([databaseId, tableNames]) => ({
          id: databaseId,
          name: databaseId,
          type: 'database' as const,
          hasContent: false,
          children: tableNames.map(tableName => ({
            id: `${databaseId}//${tableName}`,
            name: tableName,
            type: 'table' as const,
            hasContent: true
          }))
        })
      );
    },
    fetchChildNodes: {
      table: async () => [] // Tables currently have no sub-children
    }
  }
  // ADD NEW PROVIDERS HERE
]);

interface ITreeBrowserProps {
  jupyterApp: JupyterFrontEnd;
}

/**
 * Main Tree Browser Component
 *
 * This is the primary component that manages the tree state and renders the tree UI.
 * It automatically handles all configured data providers and their loading states.
 */
export const TreeBrowser: FC<ITreeBrowserProps> = ({ jupyterApp }) => {
  const sessionContext = useSessionContext(jupyterApp);
  // Initialize tree with root nodes for each configured provider
  const [treeData, setTreeData] = useState<TreeNodeType[]>(
    treeQueryManager.initialTreeStructure
  );

  // Callback to update individual nodes in the tree structure
  const handleNodeUpdate = useCallback<TreeNodeMutator>(
    (nodeId: string, updatedNode: TreeNodeType) => {
      setTreeData(currentTreeData =>
        updateNodeInTree(currentTreeData, nodeId, updatedNode)
      );
    },
    []
  );

  return (
    <Container className="jp-TreeBrowserWidget" maxWidth="sm">
      {/* Invisible component that manages data loading for all providers */}
      {sessionContext && (
        <TreeDataLoader
          treeData={treeData}
          sessionContext={sessionContext}
          onNodeUpdate={handleNodeUpdate}
        />
      )}
      {/* The actual tree UI component */}
      <Tree data={treeData}>
        {nodeProps => (
          <TreeNodeRenderer
            {...nodeProps}
            sessionContext={sessionContext!}
            onNodeUpdate={handleNodeUpdate}
          />
        )}
      </Tree>
    </Container>
  );
};

/**
 * Tree Node Renderer Component
 *
 * Renders individual tree nodes and handles lazy loading of child nodes.
 * When a parent node is expanded, this component automatically fetches
 * children using the appropriate provider's fetchChildNodes function.
 */
const TreeNodeRenderer: FC<ITreeNodeRendererProps> = ({
  node,
  style,
  dragHandle,
  tree,
  sessionContext,
  onNodeUpdate
}) => {
  // Determine if we need to load children (parent is open but children not loaded)
  const shouldLoadChildren =
    node.parent?.isOpen && node.data.children === undefined;

  // Query to fetch child nodes when needed
  const childNodesQuery = useQuery({
    enabled: shouldLoadChildren,
    queryKey: ['tree-children', node.id],
    queryFn: () =>
      treeQueryManager.loadChildNodesForNode(
        node.id,
        tree.root.data.children!,
        sessionContext
      ),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
    retryDelay: 1000
  });

  // Handle loading errors
  useEffect(() => {
    if (childNodesQuery.error) {
      console.error(
        `Failed to load children for node '${node.id}':`,
        childNodesQuery.error
      );
    }
  }, [childNodesQuery.error, node.id]);

  // Update tree when child data is loaded
  useEffect(() => {
    if (childNodesQuery.data) {
      onNodeUpdate(node.id, {
        ...node.data,
        children: childNodesQuery.data
      });
    }
  }, [childNodesQuery.data, node.id, node.data, onNodeUpdate]);

  const handleNodeClick = () => {
    if (!node.isLeaf) {
      tree.get(node.id)?.toggle();
    }
  };

  return (
    <div style={style} ref={dragHandle} onClick={handleNodeClick}>
      <Stack direction="row" spacing={1} alignItems="center">
        {/* Expand/collapse icon for parent nodes */}
        {!node.isLeaf && (
          <FontAwesomeIcon
            fixedWidth
            icon={node.isOpen ? faAngleDown : faAngleRight}
          />
        )}
        <Typography variant="body1">{node.data.name}</Typography>
        {/* Action button for leaf nodes */}
        {node.isLeaf && (
          <IconButton size="small">
            <FontAwesomeIcon
              fontSize="inherit"
              fixedWidth
              icon={faRightToBracket}
            />
          </IconButton>
        )}
      </Stack>
    </div>
  );
};

interface ITreeDataLoaderProps {
  treeData: TreeNodeType[];
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
}

/**
 * Tree Data Loader Component
 *
 * Invisible component that manages data loading for all configured providers.
 * Creates a RootDataLoader for each provider to handle initial data fetching.
 */
const TreeDataLoader: FC<ITreeDataLoaderProps> = ({
  treeData,
  sessionContext,
  onNodeUpdate
}) => {
  return (
    <>
      {/* Create a data loader for each configured provider */}
      {treeQueryManager.providerNames.map(providerName => (
        <RootDataLoader
          key={providerName}
          providerName={providerName}
          treeData={treeData}
          sessionContext={sessionContext}
          onNodeUpdate={onNodeUpdate}
        />
      ))}
    </>
  );
};

interface IRootDataLoaderProps {
  providerName: string;
  treeData: TreeNodeType[];
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
}

/**
 * Root Data Loader Component
 *
 * Handles initial data loading for a specific provider.
 * Calls the provider's fetchRootNodes function and updates the tree
 * when data is available.
 */
const RootDataLoader: FC<IRootDataLoaderProps> = ({
  providerName,
  treeData,
  sessionContext,
  onNodeUpdate
}) => {
  const rootNode = treeData.find(node => node.name === providerName);

  // Query to fetch root nodes for this provider
  const rootNodesQuery = useQuery({
    enabled: Boolean(rootNode && !rootNode.children),
    queryKey: ['tree-root', providerName],
    queryFn: () =>
      treeQueryManager.fetchRootNodesForProvider(providerName, sessionContext),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Handle data loading and errors
  useEffect(() => {
    if (!rootNode) {
      return;
    }

    if (rootNodesQuery.error) {
      console.error(
        `Failed to load root nodes for provider '${providerName}':`,
        rootNodesQuery.error
      );
    }

    if (rootNodesQuery.data) {
      onNodeUpdate(rootNode.id, {
        ...rootNode,
        children: rootNodesQuery.data
      });
    }
  }, [
    rootNodesQuery.data,
    rootNodesQuery.error,
    rootNode,
    providerName,
    onNodeUpdate
  ]);

  return null; // This component renders nothing
};

/**
 * Creates a tree query manager from an array of data providers
 *
 * This function processes the provider configurations and creates a unified
 * interface for the tree browser to interact with all providers.
 *
 * @param dataProviders - Array of ITreeDataProvider objects
 * @returns Object with methods to fetch data and initial tree structure
 */
function createTreeQueryManager(dataProviders: ITreeDataProvider[]) {
  const providerNames = dataProviders.map(provider => provider.name);

  // Function to fetch root nodes for a specific provider
  const fetchRootNodesForProvider = (
    providerName: string,
    sessionContext: SessionContext
  ): Promise<TreeNodeType[]> => {
    const provider = dataProviders.find(p => p.name === providerName);
    if (!provider) {
      throw new Error(`Tree data provider '${providerName}' not found`);
    }
    return provider.fetchRootNodes(sessionContext);
  };

  // Function to load child nodes for a specific node
  const loadChildNodesForNode = async (
    nodeId: string,
    treeData: TreeNodeType[],
    sessionContext: SessionContext
  ): Promise<TreeNodeType[]> => {
    // Find the node in the tree
    const nodeLocation = findNodeInTree(nodeId, treeData);
    if (!nodeLocation) {
      throw new Error(`Tree node with id '${nodeId}' not found`);
    }

    const { node, ancestors } = nodeLocation;
    // The provider is determined by the root ancestor
    const providerName = ancestors[0].name;
    const provider = dataProviders.find(p => p.name === providerName);

    if (!provider) {
      throw new Error(`Tree data provider '${providerName}' not found`);
    }

    // Get the appropriate child loader for this node type
    const childLoader = provider.fetchChildNodes[node.type];
    if (!childLoader) {
      throw new Error(`No child loader found for node type '${node.type}'`);
    }

    return await childLoader(node, sessionContext);
  };

  // Create initial tree structure with root nodes for each provider
  const initialTreeStructure = dataProviders.map(provider => ({
    id: `tree-root-${provider.name}`,
    name: provider.name,
    type: 'ROOT' as const
  }));

  return {
    dataProviders,
    providerNames,
    fetchRootNodesForProvider,
    loadChildNodesForNode,
    initialTreeStructure
  };
}

/**
 * Recursively searches for a node in the tree structure
 *
 * @param nodeId - The ID of the node to find
 * @param treeData - The tree data to search in
 * @param ancestors - Array of ancestor nodes (used for recursion)
 * @returns Object containing the found node and its ancestors, or undefined
 */
function findNodeInTree(
  nodeId: string,
  treeData: TreeNodeType[],
  ancestors: TreeNodeType[] = []
): { node: TreeNodeType; ancestors: TreeNodeType[] } | undefined {
  for (const currentNode of treeData) {
    if (currentNode.id === nodeId) {
      return { node: currentNode, ancestors };
    }

    // Recursively search in children
    if (currentNode.children) {
      const result = findNodeInTree(nodeId, currentNode.children, [
        ...ancestors,
        currentNode
      ]);
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}

/**
 * Immutably updates a node in the tree structure
 *
 * @param treeData - The current tree data
 * @param nodeId - The ID of the node to update
 * @param updatedNode - The new node data
 * @returns New tree data with the node updated
 */
function updateNodeInTree(
  treeData: TreeNodeType[],
  nodeId: string,
  updatedNode: TreeNodeType
): TreeNodeType[] {
  return treeData.map(node => {
    if (node.id === nodeId) {
      return updatedNode;
    }

    // Recursively update in children if they exist
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, nodeId, updatedNode)
      };
    }

    return node;
  });
}
