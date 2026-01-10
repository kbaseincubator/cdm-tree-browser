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
import { IContextMenuState } from './hooks/useContextMenu';

interface IContextMenuProps {
  menuState: IContextMenuState;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: (node: TreeNodeType) => void;
  sessionContext: SessionContext | null;
}

export const ContextMenu: FC<IContextMenuProps> = ({
  menuState,
  isOpen,
  onClose,
  onViewDetails,
  sessionContext
}) => {
  const { node, anchorPosition } = menuState;

  if (!node || !anchorPosition) {
    return null;
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(node.name);
    onClose();
  };

  const handleViewDetails = () => {
    onViewDetails(node);
    onClose();
  };

  const hasInfoRenderer = Boolean(node.infoRenderer);
  const providerItems = node.contextMenuItems || [];

  return (
    <Menu
      open={isOpen}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
    >
      <MenuItem onClick={handleCopyName}>
        <ListItemIcon>
          <FontAwesomeIcon icon={faCopy} />
        </ListItemIcon>
        <ListItemText>Copy name</ListItemText>
      </MenuItem>

      {hasInfoRenderer && (
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
            onClose();
          }}
        >
          {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
          <ListItemText>{item.label}</ListItemText>
        </MenuItem>
      ))}
    </Menu>
  );
};
