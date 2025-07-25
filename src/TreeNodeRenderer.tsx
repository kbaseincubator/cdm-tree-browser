import React, { FC, useEffect } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { NodeRendererProps } from 'react-arborist';
import { IconButton, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFile,
  faFolder,
  faFolderOpen,
  faCircleInfo,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { TreeNodeType, TreeNodeMutator } from './sharedTypes';
import { treeQueryManager } from './treeQueryManager';

/** Props for the TreeNodeRenderer component */
interface ITreeNodeRendererProps extends NodeRendererProps<TreeNodeType> {
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
  onInfoClick: (nodeId: string, node: TreeNodeType) => void;
}

/** Function to get the appropriate icon for a node */
const getNodeIcon = (node: TreeNodeType, isOpen?: boolean): React.ReactNode => {
  // Use custom icon if provided
  if (node.icon) {
    return node.icon;
  }
  
  // Default to file icon for nodes without custom icons
  return <FontAwesomeIcon icon={faFile} />;
};

/**
 * Tree Node Renderer Component
 *
 * Renders individual tree nodes and handles lazy loading of child nodes.
 * When a parent node is expanded, this component automatically fetches
 * children using the appropriate provider's fetchChildNodes function.
 */
export const TreeNodeRenderer: FC<ITreeNodeRendererProps> = ({
  node,
  style,
  dragHandle,
  tree,
  sessionContext,
  onNodeUpdate,
  onInfoClick
}) => {
  
  // Determine if we need to load children (parent is open but children not loaded)
  // Only load children for nodes that are configured as parent nodes in the provider, excluding ROOT nodes
  const shouldLoadChildren =
    node.parent?.isOpen && node.data.children === undefined && node.data.isParentNode && node.data.type !== 'ROOT';

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
    onInfoClick(node.id, node.data);
  };

  const isProvider = node.data.type === 'ROOT';

  return (
    <div style={style} ref={dragHandle}>
      <div onClick={handleNodeClick}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Provider icon (larger, no folder) */}
          {isProvider && (
            <span style={{ fontSize: '1.2em' }}>
              {!node.data.children ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                node.data.icon
              )}
            </span>
          )}
          {/* Expand/collapse icon for non-provider parent nodes */}
          {!node.isLeaf && !isProvider && (
            <FontAwesomeIcon
              fixedWidth
              icon={childNodesQuery.isLoading ? faSpinner : (node.isOpen ? faFolderOpen : faFolder)}
              spin={childNodesQuery.isLoading}
            />
          )}
          {/* Node type icon for leaf nodes */}
          {!node.data.isParentNode && !isProvider && getNodeIcon(node.data, node.isOpen)}
          <Typography 
            variant="body1" 
            sx={{ fontWeight: isProvider ? 'bold' : 'normal' }}
          >
            {node.data.name}
          </Typography>
          {/* Info button - only show if node has an info renderer */}
          {node.data.infoRenderer && (
            <IconButton size="small" sx={{ p: 0.25 }} onClick={handleInfoClick}>
              <FontAwesomeIcon
                size="xs"
                fixedWidth
                icon={faCircleInfo}
              />
            </IconButton>
          )}
        </Stack>
      </div>
    </div>
  );
};