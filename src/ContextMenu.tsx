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

/** Handler functions for context menu actions */
export interface IContextMenuHandlers {
  viewDetails?: (node: TreeNodeType) => void;
}

interface IContextMenuProps {
  menu: IContextMenu;
  handlers: IContextMenuHandlers;
  sessionContext: SessionContext | null;
}

export const ContextMenu: FC<IContextMenuProps> = ({
  menu,
  handlers,
  sessionContext
}) => {
  const { node, anchorPosition, isOpen, close } = menu;

  if (!node || !anchorPosition) {
    return null;
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(node.name);
    close();
  };

  const handleViewDetails = () => {
    handlers.viewDetails?.(node);
    close();
  };

  const showViewDetails = Boolean(node.infoRenderer && handlers.viewDetails);
  const providerItems = node.contextMenuItems || [];

  return (
    <Menu
      open={isOpen}
      onClose={close}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
    >
      <MenuItem onClick={handleCopyName}>
        <ListItemIcon>
          <FontAwesomeIcon icon={faCopy} />
        </ListItemIcon>
        <ListItemText>Copy name</ListItemText>
      </MenuItem>

      {showViewDetails && (
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faCircleInfo} />
          </ListItemIcon>
          <ListItemText>View details</ListItemText>
        </MenuItem>
      )}

      {providerItems.length > 0 && <Divider />}

      {providerItems.map((item, index) => (
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
      ))}
    </Menu>
  );
};
