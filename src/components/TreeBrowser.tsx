import React, {
  useState,
  FC,
  useCallback,
  useRef,
  useEffect,
  useMemo
} from 'react';
import { JupyterFrontEnd, ILayoutRestorer } from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { Tree, TreeApi } from 'react-arborist';
import { useSessionContext } from './kernelCommunication';
import { TreeNodeType, TreeNodeMutator } from '../sharedTypes';
import { treeQueryManager, updateNodeInTree } from '../treeQueryManager';
import { useTreeDimensions } from '../hooks/useTreeDimensions';
import { useInfoPanel } from '../hooks/useInfoPanel';
import { useMockNotification } from '../hooks/useMockNotification';
import { TreeDataLoader } from '../TreeDataLoader';
import { TreeNodeRenderer } from '../TreeNodeRenderer';
import { InfoPanel } from '../InfoPanel';
import { showError } from '../utils/errorUtil';
import { debounce } from '../utils/debounce';

const STATE_KEY_OPEN_NODES = 'cdm-tree-browser:open-nodes';
const DEBOUNCE_DELAY_MS = 500;

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
  const {
    sessionContext,
    error: sessionError,
    isConnecting
  } = useSessionContext(jupyterApp);
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeApi<TreeNodeType>>(null);
  const containerDimensions = useTreeDimensions(containerRef);
  const { openNode, toggleInfo, closeInfo } = useInfoPanel();

  // Check if mocks are active and show notification
  useMockNotification(sessionContext);

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
        const savedState = await stateDB.fetch(STATE_KEY_OPEN_NODES);
        if (savedState && Array.isArray(savedState)) {
          setOpenNodeIds(savedState);
        }
      } catch (error) {
        console.warn('Failed to restore tree state:', error);
      }
    };

    restoreTreeState();
  }, [jupyterApp, stateDB]);

  // Debounced state save function
  const debouncedStateSave = useMemo(
    () =>
      debounce(async (openIds: string[]) => {
        try {
          await stateDB.save(STATE_KEY_OPEN_NODES, openIds);
        } catch (error) {
          console.warn('Failed to save tree state:', error);
        }
      }, DEBOUNCE_DELAY_MS),
    [stateDB]
  );

  // Update open state tracking when user interacts with tree
  const handleTreeStateChange = useCallback(() => {
    setHasUserInteracted(true);
    if (treeRef.current) {
      const currentOpenIds = treeRef.current.visibleNodes
        .filter(node => node.isOpen)
        .map(node => node.id);
      setOpenNodeIds(currentOpenIds);
      debouncedStateSave(currentOpenIds);
    }
  }, [debouncedStateSave]);

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
      {/* Kernel connection status */}
      {isConnecting && (
        <div style={{ padding: '8px', color: '#666', fontSize: '12px' }}>
          Connecting to kernel...
        </div>
      )}
      {/* Invisible component that manages data loading for all providers */}
      {sessionContext && (
        <TreeDataLoader
          treeData={treeData}
          sessionContext={sessionContext}
          onNodeUpdate={handleNodeUpdate}
        />
      )}
      {/* The actual tree UI component - takes full height */}
      {sessionContext && (
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
              sessionContext={sessionContext}
              onNodeUpdate={handleNodeUpdate}
              onInfoClick={toggleInfo}
              onToggle={handleTreeStateChange}
              restoreOpenNodeIds={hasUserInteracted ? [] : openNodeIds}
              treeData={treeData}
            />
          )}
        </Tree>
      )}

      {/* Fixed bottom panel for node info */}
      <InfoPanel
        openNode={openNode}
        sessionContext={sessionContext || null}
        onClose={closeInfo}
      />
    </div>
  );
};
