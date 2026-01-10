import { useState, useCallback, useMemo } from 'react';
import { TreeNodeType } from '../sharedTypes';

/** Context menu handle returned by useContextMenu */
export interface IContextMenu {
  /** The node the context menu is for */
  node: TreeNodeType | null;
  /** Position for the menu */
  anchorPosition: { top: number; left: number } | null;
  /** Whether the menu is open */
  isOpen: boolean;
  /** Open menu from a button click (anchored below button) */
  openFromButton: (
    event: React.MouseEvent<HTMLElement>,
    node: TreeNodeType
  ) => void;
  /** Open menu from right-click (anchored at cursor) */
  openFromRightClick: (
    event: React.MouseEvent<HTMLElement>,
    node: TreeNodeType
  ) => void;
  /** Close the menu */
  close: () => void;
}

/** Manages context menu state for tree nodes */
export function useContextMenu(): IContextMenu {
  const [node, setNode] = useState<TreeNodeType | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const openFromButton = useCallback(
    (event: React.MouseEvent<HTMLElement>, targetNode: TreeNodeType) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      setAnchorPosition({ top: rect.bottom, left: rect.left });
      setNode(targetNode);
    },
    []
  );

  const openFromRightClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, targetNode: TreeNodeType) => {
      event.preventDefault();
      event.stopPropagation();
      setAnchorPosition({ top: event.clientY, left: event.clientX });
      setNode(targetNode);
    },
    []
  );

  const close = useCallback(() => {
    setAnchorPosition(null);
    setNode(null);
  }, []);

  const isOpen = Boolean(anchorPosition);

  return useMemo(
    () => ({
      node,
      anchorPosition,
      isOpen,
      openFromButton,
      openFromRightClick,
      close
    }),
    [node, anchorPosition, isOpen, openFromButton, openFromRightClick, close]
  );
}
