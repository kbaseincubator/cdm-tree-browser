import React, { useState, FC, useCallback, useRef, useEffect } from 'react';
import { JupyterFrontEnd, ILayoutRestorer } from '@jupyterlab/application';
import { Tree, TreeApi } from 'react-arborist';
import { useSessionContext } from './kernelCommunication';
import { TreeNodeType, TreeNodeMutator } from '../sharedTypes';
import { treeQueryManager, updateNodeInTree } from '../treeQueryManager';
import { useTreeDimensions } from '../hooks/useTreeDimensions';
import { useInfoPanel } from '../hooks/useInfoPanel';
import { TreeDataLoader } from '../TreeDataLoader';
import { TreeNodeRenderer } from '../TreeNodeRenderer';
import { InfoPanel } from '../InfoPanel';

interface ITreeBrowserProps {
  jupyterApp: JupyterFrontEnd;
  restorer: ILayoutRestorer;
}

/**
 * Main Tree Browser Component
 *
 * This is the primary component that manages the tree state and renders the tree UI.
 * It automatically handles all configured data providers and their loading states.
 */
export const TreeBrowser: FC<ITreeBrowserProps> = ({ jupyterApp, restorer }) => {
  const sessionContext = useSessionContext(jupyterApp);
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeApi<TreeNodeType>>(null);
  const containerDimensions = useTreeDimensions(containerRef);
  const { openNode, toggleInfo, closeInfo } = useInfoPanel();

  // Initialize tree with root nodes for each configured provider
  const [treeData, setTreeData] = useState<TreeNodeType[]>(
    treeQueryManager.initialTreeStructure
  );

  // State for tree node restoration
  const [openNodeIds, setOpenNodeIds] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Restore saved open node state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('cdm-tree-browser-open-nodes');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (Array.isArray(parsedState)) {
          setOpenNodeIds(parsedState);
        }
      }
    } catch (error) {
      console.warn('Failed to restore tree state:', error);
    }
  }, []);


  // Update open state tracking when user interacts with tree
  const handleTreeStateChange = useCallback(() => {
    setHasUserInteracted(true);
    if (treeRef.current) {
      const currentOpenIds = treeRef.current.visibleNodes
        .filter(node => node.isOpen)
        .map(node => node.id);
      setOpenNodeIds(currentOpenIds);
      localStorage.setItem('cdm-tree-browser-open-nodes', JSON.stringify(currentOpenIds));
    }
  }, []);

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
    <div
      ref={containerRef}
      className="jp-TreeBrowserWidget"
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        padding: '8px'
      }}
    >
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
        ref={treeRef}
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
            onInfoClick={toggleInfo}
            onToggle={handleTreeStateChange}
            restoreOpenNodeIds={hasUserInteracted ? [] : openNodeIds}
          />
        )}
      </Tree>

      {/* Fixed bottom panel for node info */}
      <InfoPanel
        openNode={openNode}
        sessionContext={sessionContext || null}
        onClose={closeInfo}
      />
    </div>
  );
};
