import { useState, useCallback } from 'react';
import { TreeNodeType } from '../sharedTypes';

interface InfoPanelState {
  openNodeId: string | null;
  openNode: TreeNodeType | null;
}

export function useInfoPanel() {
  const [state, setState] = useState<InfoPanelState>({
    openNodeId: null,
    openNode: null
  });

  const toggleInfo = useCallback((nodeId: string, node: TreeNodeType) => {
    setState(currentState => {
      if (currentState.openNodeId === nodeId) {
        // Close if clicking the same node
        return { openNodeId: null, openNode: null };
      } else {
        // Open new node
        return { openNodeId: nodeId, openNode: node };
      }
    });
  }, []);

  const closeInfo = useCallback(() => {
    setState({ openNodeId: null, openNode: null });
  }, []);

  return {
    openNodeId: state.openNodeId,
    openNode: state.openNode,
    toggleInfo,
    closeInfo
  };
}