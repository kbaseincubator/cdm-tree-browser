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
import { TreeNodeType } from './sharedTypes';
import { IContextMenu } from './hooks/useContextMenu';
import { IInfoPanel } from './hooks/useInfoPanel';

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
    sessionContext: SessionContext | null
  ) => void;
}

interface IContextMenuProps {
  menu: IContextMenu;
  infoPanel: IInfoPanel;
  sessionContext: SessionContext | null;
}

export const ContextMenu: FC<IContextMenuProps> = ({
  menu,
  infoPanel,
  sessionContext
}) => {
  const { node, anchorPosition, isOpen, close } = menu;

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
        item.action(node, sessionContext);
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
