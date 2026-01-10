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
  faEllipsisVertical,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { TreeNodeType, TreeNodeMutator } from './sharedTypes';
import { treeQueryManager } from './treeQueryManager';
import { showErrorWithRetry } from './utils/errorUtil';

/** Props for the TreeNodeRenderer component */
interface ITreeNodeRendererProps extends NodeRendererProps<TreeNodeType> {
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
  /** Callback triggered when node open state changes */
  onToggle?: () => void;
  /** Array of node IDs that should be restored to open state */
  restoreOpenNodeIds: string[];
  /** The full tree data for searching nodes */
  treeData: TreeNodeType[];
  /** Callback for context menu button click */
  onContextMenuButton: (
    event: React.MouseEvent<HTMLElement>,
    node: TreeNodeType
  ) => void;
  /** Callback for right-click context menu */
  onContextMenuRightClick: (
    event: React.MouseEvent<HTMLElement>,
    node: TreeNodeType
  ) => void;
  /** ID of the last clicked node (for touch device menu button visibility) */
  activeNodeId: string | null;
  /** Callback when node is clicked */
  onNodeActive: (nodeId: string) => void;
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
  onToggle,
  restoreOpenNodeIds,
  treeData,
  onContextMenuButton,
  onContextMenuRightClick,
  activeNodeId,
  onNodeActive
}) => {
  // Determine if we need to load children (parent is open but children not loaded)
  // Only load children for nodes that are configured as parent nodes in the provider, excluding ROOT nodes
  const shouldLoadChildren =
    node.parent?.isOpen &&
    node.data.children === undefined &&
    node.data.isParentNode &&
    node.data.type !== 'ROOT';

  // Query to fetch child nodes when needed
  const childNodesQuery = useQuery({
    enabled: shouldLoadChildren,
    queryKey: ['tree-children', node.id],
    queryFn: () =>
      treeQueryManager.loadChildNodesForNode(node.id, treeData, sessionContext),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
    retryDelay: 1000
  });

  // Handle loading errors
  useEffect(() => {
    if (childNodesQuery.error) {
      showErrorWithRetry(
        childNodesQuery.error,
        `Failed to load children for ${node.data.name}`,
        () => childNodesQuery.refetch()
      );
    }
  }, [childNodesQuery.error, node.id, node.data.name, childNodesQuery.refetch]);

  // Update tree when child data is loaded
  useEffect(() => {
    if (childNodesQuery.data && node.data.children === undefined) {
      onNodeUpdate(node.id, {
        ...node.data,
        children: childNodesQuery.data
      });
    }
  }, [childNodesQuery.data, node.id, onNodeUpdate]);

  // Auto-restore previously open node state for lazy-loaded nodes
  useEffect(() => {
    const shouldRestore =
      restoreOpenNodeIds.includes(node.id) && !node.isOpen && !node.isLeaf;

    if (shouldRestore) {
      const treeNode = tree.get(node.id);
      if (treeNode) {
        treeNode.open();
        // Notify parent of state change after DOM update
        if (onToggle) {
          setTimeout(onToggle, 0);
        }
      }
    }
  }, [node.id, node.isOpen, node.isLeaf, restoreOpenNodeIds, tree, onToggle]);

  const handleNodeClick = () => {
    // Mark this node as active (for touch device menu button visibility)
    onNodeActive(node.id);

    if (!node.isLeaf) {
      tree.get(node.id)?.toggle();
      // Notify parent of state change after DOM update
      if (onToggle) {
        setTimeout(onToggle, 0);
      }
    }
  };

  const handleMenuButtonClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onContextMenuButton(e, node.data);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLElement>) => {
    // Only show context menu for non-ROOT nodes
    if (node.data.type !== 'ROOT') {
      onContextMenuRightClick(e, node.data);
    }
  };

  const isProvider = node.data.type === 'ROOT';

  return (
    <div style={style} ref={dragHandle}>
      <div
        className="cdm-tree-node-row"
        onClick={handleNodeClick}
        onContextMenu={handleContextMenu}
      >
        <Stack
          direction="row"
          spacing={0}
          alignItems="center"
          justifyItems="start"
        >
          {/* Provider icon (larger, no folder) */}
          {isProvider && (
            <IconButton size="small">
              {!node.data.children ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                node.data.icon
              )}
            </IconButton>
          )}
          {/* Expand/collapse icon for non-provider parent nodes */}
          {node.data.isParentNode && !isProvider && (
            <IconButton size="small">
              {childNodesQuery.isLoading ? (
                <FontAwesomeIcon fixedWidth size="sm" icon={faSpinner} spin />
              ) : node.data.icon ? (
                node.data.icon
              ) : (
                <FontAwesomeIcon
                  fixedWidth
                  size="sm"
                  icon={node.isOpen ? faFolderOpen : faFolder}
                />
              )}
            </IconButton>
          )}
          {/* Node type icon for leaf nodes */}
          {!node.data.isParentNode && !isProvider && (
            <IconButton size="small">
              {getNodeIcon(node.data, node.isOpen)}
            </IconButton>
          )}
          <Typography
            variant="body2"
            sx={{ fontWeight: isProvider ? 'bold' : 'normal' }}
            height="1.2em"
          >
            {node.data.name}
          </Typography>
        </Stack>
        {/* Context menu button - only for non-ROOT nodes */}
        {!isProvider && (
          <IconButton
            size="small"
            onClick={handleMenuButtonClick}
            aria-label="More options"
            className={`cdm-tree-menu-button${activeNodeId === node.id ? ' cdm-tree-menu-button-active' : ''}`}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'background.paper',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <FontAwesomeIcon size="xs" icon={faEllipsisVertical} />
          </IconButton>
        )}
      </div>
    </div>
  );
};
