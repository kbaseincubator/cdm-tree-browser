import { useState, useCallback, useMemo } from 'react';
import { TreeNodeType } from '../sharedTypes';

/** Info panel state and controls */
export interface IInfoPanel {
  /** Currently displayed node, or null if closed */
  node: TreeNodeType | null;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Open the panel for a node */
  open: (node: TreeNodeType) => void;
  /** Close the panel */
  close: () => void;
  /** Toggle the panel for a node (close if same node, open otherwise) */
  toggle: (node: TreeNodeType) => void;
}

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
