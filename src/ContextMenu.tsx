import React, { FC } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { SessionContext } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { TreeNodeType } from './sharedTypes';
import { IInfoPanel } from './InfoPanel';

/** JupyterLab services available to context menu actions */
export interface IContextMenuServices {
  app: JupyterFrontEnd;
  notebookTracker: INotebookTracker;
}

/** Context menu state and controls */
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

/**
 * Context menu item definition for provider-defined menu items
 */
export interface IContextMenuItem<T extends string = string> {
  /** Display label for the menu item */
  label: string;
  /** Optional icon to display next to the label */
  icon?: React.ReactNode;
  /** Action to perform when menu item is clicked */
  action: (
    node: TreeNodeType<T>,
    sessionContext: SessionContext | null,
    services: IContextMenuServices
  ) => void;
}

interface IContextMenuProps {
  state: IContextMenu;
  infoPanel: IInfoPanel;
  sessionContext: SessionContext | null;
  services: IContextMenuServices;
}

export const ContextMenu: FC<IContextMenuProps> = ({
  state,
  infoPanel,
  sessionContext,
  services
}) => {
  const { node, anchorPosition, isOpen, close } = state;

  if (!node || !anchorPosition) {
    return null;
  }

  // Built-in menu items
  const builtInItems: IContextMenuItem[] = [
    {
      label: 'Copy name',
      icon: <FontAwesomeIcon icon={faCopy} />,
      action: n => navigator.clipboard.writeText(n.name)
    },
    ...(node.infoRenderer
      ? [
          {
            label: 'View details',
            icon: <FontAwesomeIcon icon={faCircleInfo} />,
            action: (n: TreeNodeType) => infoPanel.toggle(n)
          }
        ]
      : [])
  ];

  const providerItems = node.contextMenuItems || [];

  const renderItem = (item: IContextMenuItem, index: number) => (
    <MenuItem
      key={index}
      onClick={() => {
        item.action(node, sessionContext, services);
        close();
      }}
    >
      {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
      <ListItemText>{item.label}</ListItemText>
    </MenuItem>
  );

  return (
    <Menu
      open={isOpen}
      onClose={close}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
    >
      {builtInItems.map(renderItem)}
      {providerItems.length > 0 && <Divider />}
      {providerItems.map((item, index) =>
        renderItem(item, index + builtInItems.length)
      )}
    </Menu>
  );
};
