import React, { FC } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { Collapse, Paper, Typography } from '@mui/material';
import { TreeNodeType } from './sharedTypes';
import { treeQueryManager } from './treeQueryManager';

interface InfoPanelProps {
  openNode: TreeNodeType | null;
  treeData: TreeNodeType[];
  sessionContext: SessionContext | null;
}

/** Function to get provider for a node */
const getNodeProvider = (node: TreeNodeType, treeData: TreeNodeType[]) => {
  const nodeLocation = findNodeInTree(node.id, treeData);
  if (!nodeLocation) return undefined;

  const { ancestors } = nodeLocation;
  const providerName = ancestors[0]?.name || node.name;
  return treeQueryManager.dataProviders.find(p => p.name === providerName);
};

/** Function to get the appropriate info renderer for a node */
const getNodeInfoRenderer = (node: TreeNodeType, treeData: TreeNodeType[], sessionContext: SessionContext | null): React.ReactNode | undefined => {
  const provider = getNodeProvider(node, treeData);
  const renderer = provider?.nodeTypeInfoRenderers?.[node.type];
  return renderer ? renderer(node, sessionContext) : undefined;
};

/** Helper function to find node in tree (copied from treeQueryManager for now) */
function findNodeInTree(
  nodeId: string,
  treeData: TreeNodeType[],
  ancestors: TreeNodeType[] = []
): { node: TreeNodeType; ancestors: TreeNodeType[] } | undefined {
  for (const currentNode of treeData) {
    if (currentNode.id === nodeId) {
      return { node: currentNode, ancestors };
    }

    if (currentNode.children) {
      const result = findNodeInTree(nodeId, currentNode.children, [
        ...ancestors,
        currentNode
      ]);
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}

export const InfoPanel: FC<InfoPanelProps> = ({ openNode, treeData, sessionContext }) => {
  return (
    <Collapse in={openNode !== null}>
      <Paper sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        p: 2, 
        bgcolor: 'grey.50', 
        borderTop: 1, 
        borderColor: 'divider',
        zIndex: 1000
      }}>
        {openNode && (
          <>
            {getNodeInfoRenderer(openNode, treeData, sessionContext) || (
              <>
                <Typography variant="h6" gutterBottom>
                  {openNode.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Type: {openNode.type}
                </Typography>
                <Typography variant="body2">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </Typography>
              </>
            )}
          </>
        )}
      </Paper>
    </Collapse>
  );
};