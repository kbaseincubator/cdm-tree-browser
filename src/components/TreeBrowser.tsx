import React, { useState, FC, useEffect, useCallback, useRef } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { Tree, NodeRendererProps } from 'react-arborist';
import { IconButton, Stack, Typography, Collapse, Paper } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRightToBracket,
  faFile,
  faFolder,
  faFolderOpen,
  faDatabase,
  faTable,
  faInfo
} from '@fortawesome/free-solid-svg-icons';
import {
  parseKernelOutputJSON,
  queryKernel,
  useSessionContext
} from './kernelCommunication';

// Global state for info panel - only one node can show info at a time
let openInfoNodeId: string | null = null;
let openInfoNode: TreeNodeType | null = null;

/**
 * Core Types for Tree Browser
 */

/**
 * Represents a single node in the tree structure
 * @template T - Union type of supported node types (e.g., 'database' | 'table')
 */
type TreeNodeType<T extends string = string, D = any> = {
  /** Unique identifier for the node */
  id: string;
  /** Display name shown in the tree */
  name: string;
  /** Type of the node, used to determine child loading behavior */
  type: T;
  /** Whether this node contains actionable content */
  hasContent?: boolean;
  /** Child nodes - undefined means not loaded, empty array means loaded with no children */
  children?: TreeNodeType[];
  /** Custom icon to display for this node */
  icon?: React.ReactNode;
  /** Whether this node has children - true = has children, false = no children, undefined = unknown */
  hasChildren?: boolean;
  /** Arbitrary data for custom renderers (e.g., database name for table nodes) */
  data?: D;
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
  /** Custom icon for this provider's root node */
  icon?: React.ReactNode;
  /** Map of node type to default icon */
  nodeTypeIcons?: {
    [K in T]?: React.ReactNode;
  };
  /** Custom info panel renderers by node type - receives sessionContext for API calls */
  nodeTypeInfoRenderers?: {
    [K in T]?: (node: TreeNodeType<K>, sessionContext: SessionContext | null) => React.ReactNode;
  };
}

/** Function type for updating nodes in the tree */
type TreeNodeMutator = (id: string, updatedNode: TreeNodeType) => void;

/** Props for the TreeNodeRenderer component */
interface ITreeNodeRendererProps extends NodeRendererProps<TreeNodeType> {
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
}

/** Function to get provider configuration for a node */
const getNodeProvider = (node: TreeNodeType, treeData: TreeNodeType[]): ITreeDataProvider | undefined => {
  const nodeLocation = findNodeInTree(node.id, treeData);
  if (!nodeLocation) return undefined;

  const { ancestors } = nodeLocation;
  const providerName = ancestors[0]?.name || node.name;
  return treeQueryManager.dataProviders.find(p => p.name === providerName);
};

/** Function to get the appropriate icon for a node */
const getNodeIcon = (node: TreeNodeType, isOpen?: boolean): React.ReactNode => {
  // Use custom icon if provided
  if (node.icon) {
    return node.icon;
  }
  
  // Default to file icon for nodes without custom icons
  return <FontAwesomeIcon icon={faFile} />;
};

/** Function to get the appropriate info renderer for a node */
const getNodeInfoRenderer = (node: TreeNodeType, treeData: TreeNodeType[], sessionContext: SessionContext | null): React.ReactNode | undefined => {
  const provider = getNodeProvider(node, treeData);
  const renderer = provider?.nodeTypeInfoRenderers?.[node.type];
  return renderer ? renderer(node, sessionContext) : undefined;
};

/** Schema structure returned by get_table_schema mock function */
type TableSchema = {
  database: string;
  table: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    primary_key?: boolean;
    foreign_key?: string;
  }>;
};

/** Displays table schema by calling get_table_schema mock function */
const TableSchemaDisplay: FC<{ node: TreeNodeType; sessionContext: SessionContext | null }> = ({ node, sessionContext }) => {
  const { data: schema, isLoading, error } = useQuery({
    queryKey: ['tableSchema', node.data?.database, node.name],
    queryFn: async () => {
      if (!sessionContext) throw new Error('No session context');
      
      // Setup mock functions then call get_table_schema with node's database and name
      const { data, error } = await queryKernel(
        `import cdm_tree_browser; cdm_tree_browser.setup_cdm_mock_responses(); result = get_table_schema("${node.data?.database}", "${node.name}", return_json=True); result`,
        sessionContext
      );
      
      if (error) {
        alert(`Table schema error: ${error.message}`);
        throw error;
      }
      
      const schema = parseKernelOutputJSON<TableSchema>(data);
      if (!schema) throw new Error('No schema data returned');
      
      return schema;
    },
    enabled: !!sessionContext && !!node.data?.database
  });

  if (isLoading) return <Typography>Loading schema...</Typography>;
  if (error) return (
    <Typography color="error">
      Error loading schema: {error instanceof Error ? error.message : 'Unknown error'}
    </Typography>
  );
  if (!schema) return <Typography>{node.name}</Typography>;

  return (
    <>
      <Typography variant="h6" gutterBottom>
        {schema.table}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Database: {schema.database}
      </Typography>
      <Typography variant="body2" gutterBottom>
        Columns ({schema.columns?.length || 0}):
      </Typography>
      {schema.columns?.slice(0, 5).map((col: any, idx: number) => (
        <Typography key={idx} variant="body2" component="div" sx={{ ml: 2 }}>
          • {col.name} ({col.type})
        </Typography>
      ))}
      {schema.columns?.length > 5 && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          ... and {schema.columns.length - 5} more columns
        </Typography>
      )}
    </>
  );
};

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
    name: 'CDM Data Store',
    supportedNodeTypes: ['database', 'table'],
    icon: <FontAwesomeIcon icon={faDatabase} />,
    nodeTypeIcons: {
      database: <FontAwesomeIcon icon={faDatabase} />,
      table: <FontAwesomeIcon icon={faTable} />
    },
    nodeTypeInfoRenderers: {
      table: (node, sessionContext) => <TableSchemaDisplay node={node} sessionContext={sessionContext} />
    },
    fetchRootNodes: async (sessionContext: SessionContext) => {
      const { data, error } = await queryKernel(
        'import cdm_tree_browser; cdm_tree_browser.setup_cdm_mock_responses(); result = get_db_structure(with_schema=False,return_json=True); result',
        sessionContext
      );

      if (error) {
        console.error('CDM provider: Failed to fetch root nodes:', error);
        alert(`CDM provider error: ${error.message}`);
        return [];
      }

      const databaseStructure =
        parseKernelOutputJSON<Record<string, string[]>>(data);

      if (!databaseStructure) {
        return [];
      }

      return Object.entries(databaseStructure).map(
        ([databaseId, tableNames]) => ({
          id: databaseId,
          name: databaseId,
          type: 'database' as const,
          hasContent: false,
          hasChildren: true,
          children: tableNames.map(tableName => ({
            id: `${databaseId}//${tableName}`,
            name: tableName,
            type: 'table' as const,
            hasContent: true,
            hasChildren: false,
            data: { database: databaseId }
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 600 });
  
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

  // Measure container dimensions for Tree component using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Account for padding (8px on all sides = 16px total)
        setContainerDimensions({ 
          width: Math.max(width - 16, 200), 
          height: Math.max(height - 16, 400) 
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="jp-TreeBrowserWidget" style={{ position: 'relative', height: '100%', width: '100%', padding: '8px' }}>
      {/* Invisible component that manages data loading for all providers */}
      {sessionContext && (
        <TreeDataLoader
          treeData={treeData}
          sessionContext={sessionContext}
          onNodeUpdate={handleNodeUpdate}
        />
      )}
      {/* The actual tree UI component - takes full height */}
      <Tree 
        data={treeData} 
        openByDefault={false}
        width={containerDimensions.width}
        height={containerDimensions.height}
      >
        {nodeProps => (
          <TreeNodeRenderer
            key={nodeProps.node.id}
            {...nodeProps}
            sessionContext={sessionContext!}
            onNodeUpdate={handleNodeUpdate}
          />
        )}
      </Tree>
      
      {/* Fixed bottom panel for node info */}
      <Collapse in={openInfoNodeId !== null}>
        <Paper sx={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          p: 2, 
          bgcolor: 'grey.50', 
          borderTop: 1, 
          borderColor: 'divider',
          zIndex: 1000
        }}>
          {openInfoNode && (
            <>
              {getNodeInfoRenderer(openInfoNode, treeData, sessionContext || null) || (
                <>
                  <Typography variant="h6" gutterBottom>
                    {openInfoNode.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Type: {openInfoNode.type}
                  </Typography>
                  <Typography variant="body2">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                    tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </Typography>
                </>
              )}
            </>
          )}
        </Paper>
      </Collapse>
    </div>
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
  const [, forceUpdate] = useState({});
  
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

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (openInfoNodeId === node.id) {
      openInfoNodeId = null;
      openInfoNode = null;
    } else {
      openInfoNodeId = node.id;
      openInfoNode = node.data;
    }
    forceUpdate({});
  };

  const isProvider = node.data.type === 'ROOT';

  return (
    <div style={style} ref={dragHandle}>
      <div onClick={handleNodeClick}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Provider icon (larger, no folder) */}
          {isProvider && node.data.icon && (
            <span style={{ fontSize: '1.2em' }}>
              {node.data.icon}
            </span>
          )}
          {/* Expand/collapse icon for non-provider parent nodes */}
          {!node.isLeaf && !isProvider && (
            <FontAwesomeIcon
              fixedWidth
              icon={node.isOpen ? faFolderOpen : faFolder}
            />
          )}
          {/* Node type icon for leaf nodes */}
          {!node.data.hasChildren && !isProvider && getNodeIcon(node.data, node.isOpen)}
          <Typography 
            variant="body1" 
            sx={{ fontWeight: isProvider ? 'bold' : 'normal' }}
          >
            {node.data.name}
          </Typography>
          {/* Info button */}
          <IconButton size="small" sx={{ p: 0.25 }} onClick={handleInfoClick}>
            <FontAwesomeIcon
              size="xs"
              fixedWidth
              icon={faInfo}
            />
          </IconButton>
          {/* Action button for leaf nodes */}
          {node.isLeaf && (
            <IconButton size="small" color="primary" sx={{ p: 0.25 }}>
              <FontAwesomeIcon
                size="xs"
                fixedWidth
                icon={faRightToBracket}
              />
            </IconButton>
          )}
        </Stack>
      </div>
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

  // Function to apply provider icons to nodes
  const applyProviderIcons = (nodes: TreeNodeType[], provider: ITreeDataProvider): TreeNodeType[] => {
    return nodes.map(node => ({
      ...node,
      icon: node.icon || provider.nodeTypeIcons?.[node.type],
      children: node.children ? applyProviderIcons(node.children, provider) : node.children
    }));
  };

  // Function to fetch root nodes for a specific provider
  const fetchRootNodesForProvider = async (
    providerName: string,
    sessionContext: SessionContext
  ): Promise<TreeNodeType[]> => {
    const provider = dataProviders.find(p => p.name === providerName);
    if (!provider) {
      throw new Error(`Tree data provider '${providerName}' not found`);
    }
    const nodes = await provider.fetchRootNodes(sessionContext);
    return applyProviderIcons(nodes, provider);
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

    const childNodes = await childLoader(node, sessionContext);
    return applyProviderIcons(childNodes, provider);
  };

  // Create initial tree structure with root nodes for each provider
  const initialTreeStructure = dataProviders.map(provider => ({
    id: `tree-root-${provider.name}`,
    name: provider.name,
    type: 'ROOT' as const,
    icon: provider.icon
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
