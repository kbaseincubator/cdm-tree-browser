import React, { FC } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { Collapse, Paper, Typography, IconButton, Stack } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TreeNodeType } from './sharedTypes';

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

interface IInfoPanelProps {
  state: IInfoPanel;
  sessionContext: SessionContext | null;
}

export const InfoPanel: FC<IInfoPanelProps> = ({ state, sessionContext }) => {
  const { node, isOpen, close } = state;

  return (
    <Collapse in={isOpen}>
      <Paper
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          bgcolor: 'grey.50',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 1000
        }}
      >
        {node && (
          <>
            {/* Header with close button */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ mb: 2 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ flexGrow: 1 }}
              >
                {node.icon && (
                  <span style={{ fontSize: '1.1em' }}>{node.icon}</span>
                )}
                <Typography variant="h6">{node.name}</Typography>
              </Stack>
              <IconButton size="small" onClick={close} sx={{ ml: 1 }}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            </Stack>

            {/* Content */}
            {node.infoRenderer?.(node, sessionContext) || (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Type: {node.type}
                </Typography>
                <Typography variant="body2">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </Typography>
              </>
            )}
          </>
        )}
      </Paper>
    </Collapse>
  );
};
