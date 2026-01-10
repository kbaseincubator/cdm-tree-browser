import { useState, useCallback, useMemo } from 'react';
import { TreeNodeType } from '../sharedTypes';
import { IContextMenu } from '../ContextMenu';

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
