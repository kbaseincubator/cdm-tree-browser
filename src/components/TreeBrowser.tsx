import React, { useState, FC, useCallback, useRef, useEffect } from 'react';
import { JupyterFrontEnd, ILayoutRestorer } from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { Tree, TreeApi } from 'react-arborist';
import { useSessionContext } from './kernelCommunication';
import { TreeNodeType, TreeNodeMutator } from '../sharedTypes';
import { treeQueryManager, updateNodeInTree } from '../treeQueryManager';
import { useTreeDimensions } from '../hooks/useTreeDimensions';
import { useInfoPanel } from '../hooks/useInfoPanel';
import { TreeDataLoader } from '../TreeDataLoader';
import { TreeNodeRenderer } from '../TreeNodeRenderer';
import { InfoPanel } from '../InfoPanel';
import { showError } from '../utils/errorUtil';

interface ITreeBrowserProps {
  jupyterApp: JupyterFrontEnd;
  restorer: ILayoutRestorer;
  stateDB: IStateDB;
}

/**
 * Main Tree Browser Component
 *
 * This is the primary component that manages the tree state and renders the tree UI.
 * It automatically handles all configured data providers and their loading states.
 */
export const TreeBrowser: FC<ITreeBrowserProps> = ({
  jupyterApp,
  restorer,
  stateDB
}) => {
  const { sessionContext, error: sessionError } = useSessionContext(jupyterApp);
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

  // Show session errors to user
  useEffect(() => {
    if (sessionError) {
      showError(sessionError, 'Failed to connect to Jupyter kernel');
    }
  }, [sessionError]);

  // Restore saved open node state on mount
  useEffect(() => {
    const restoreTreeState = async () => {
      try {
        await jupyterApp.restored;
        const savedState = await stateDB.fetch('cdm-tree-browser:open-nodes');
        if (savedState && Array.isArray(savedState)) {
          setOpenNodeIds(savedState);
        }
      } catch (error) {
        console.warn('Failed to restore tree state:', error);
      }
    };

    restoreTreeState();
  }, [jupyterApp, stateDB]);

  // Update open state tracking when user interacts with tree
  const handleTreeStateChange = useCallback(async () => {
    setHasUserInteracted(true);
    if (treeRef.current) {
      const currentOpenIds = treeRef.current.visibleNodes
        .filter(node => node.isOpen)
        .map(node => node.id);
      setOpenNodeIds(currentOpenIds);

      try {
        await stateDB.save('cdm-tree-browser:open-nodes', currentOpenIds);
      } catch (error) {
        console.warn('Failed to save tree state:', error);
      }
    }
  }, [stateDB]);

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
