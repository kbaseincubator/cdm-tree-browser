import { useState, useCallback } from 'react';
import { TreeNodeType } from '../sharedTypes';

export function useInfoPanel() {
  const [openNode, setOpenNode] = useState<TreeNodeType | null>(null);

  const toggleInfo = useCallback((nodeId: string, node: TreeNodeType) => {
    setOpenNode(currentNode => {
      if (currentNode?.id === nodeId) {
        // Close if clicking the same node
        return null;
      } else {
        // Open new node
        return node;
      }
    });
  }, []);

  const closeInfo = useCallback(() => {
    setOpenNode(null);
  }, []);

  return {
    openNode,
    toggleInfo,
    closeInfo
  };
}