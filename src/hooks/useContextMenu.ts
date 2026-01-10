import { useState, useCallback } from 'react';
import { TreeNodeType } from '../sharedTypes';

export interface IContextMenuState {
  /** Position for the menu */
  anchorPosition: { top: number; left: number } | null;
  /** The node the context menu is for */
  node: TreeNodeType | null;
}

const INITIAL_STATE: IContextMenuState = {
  anchorPosition: null,
  node: null
};

/** Manages context menu state for tree nodes */
export function useContextMenu() {
  const [menuState, setMenuState] = useState<IContextMenuState>(INITIAL_STATE);

  const openMenuFromButton = useCallback(
    (event: React.MouseEvent<HTMLElement>, node: TreeNodeType) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuState({
        anchorPosition: { top: rect.bottom, left: rect.left },
        node
      });
    },
    []
  );

  const openMenuFromRightClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, node: TreeNodeType) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuState({
        anchorPosition: { top: event.clientY, left: event.clientX },
        node
      });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenuState(INITIAL_STATE);
  }, []);

  const isOpen = Boolean(menuState.anchorPosition);

  return {
    menuState,
    isOpen,
    openMenuFromButton,
    openMenuFromRightClick,
    closeMenu
  };
}
