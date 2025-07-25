import React, { useState, FC, useCallback, useRef } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Tree } from 'react-arborist';
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
  const containerDimensions = useTreeDimensions(containerRef);
  const { openNode, toggleInfo, closeInfo } = useInfoPanel();

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
