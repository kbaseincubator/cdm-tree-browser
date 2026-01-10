import { useState, useCallback, useMemo } from 'react';
import { TreeNodeType } from '../sharedTypes';
import { IInfoPanel } from '../InfoPanel';

/** Manages info panel state for displaying node details */
export function useInfoPanel(): IInfoPanel {
  const [node, setNode] = useState<TreeNodeType | null>(null);

  const open = useCallback((targetNode: TreeNodeType) => {
    setNode(targetNode);
  }, []);

  const close = useCallback(() => {
    setNode(null);
  }, []);

  const toggle = useCallback((targetNode: TreeNodeType) => {
    setNode(currentNode =>
      currentNode?.id === targetNode.id ? null : targetNode
    );
  }, []);

  const isOpen = node !== null;

  return useMemo(
    () => ({ node, isOpen, open, close, toggle }),
    [node, isOpen, open, close, toggle]
  );
}
