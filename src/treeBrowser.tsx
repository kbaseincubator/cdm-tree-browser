import { JupyterFrontEnd } from '@jupyterlab/application';

import React, { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tree } from 'react-arborist';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDown,
  faAngleRight,
  faRightToBracket
} from '@fortawesome/free-solid-svg-icons';
import { Container, IconButton, Stack, Typography } from '@mui/material';
import { queryKernel, useSessionContext } from './kernelCommunication';

export const TreeBrowser: FC<{ jupyterApp: JupyterFrontEnd }> = ({
  jupyterApp
}) => {
  const sessionContext = useSessionContext(jupyterApp);
  // For API calls we can use react-query (instead of rtk-query as redux is overkill)

  const query = useQuery({
    queryKey: ['namespaces'],
    enabled: !!sessionContext && jupyterApp.serviceManager.isReady,
    queryFn: () =>
      queryKernel(
        "import json\njson.dumps(['alexey', 'alexeyranjan', 'alexeyv8', 'credit_engine', 'default', 'enigma', 'fastgenomics', 'filipedb', 'gazi_db', 'img', 'janaka_db', 'modelseed_biochemistry', 'ontology_data', 'pangenome_ke', 'ranjandb', 'scarecrow_db', 'semsql', 'test'])",
        sessionContext!
      ),
    select: (data): ITreeNode[] => {
      if (
        data.data &&
        typeof data.data === 'object' &&
        'text/plain' in data.data
      ) {
        return (
          JSON.parse(
            (data.data['text/plain'] as string).replace(/^'|'$/g, '')
          ) as string[]
        ).map(
          (name: string, i): ITreeNode => ({
            id: i.toString(),
            name: name,
            children: [
              { id: `${i}.a`, name: 'Data 1', onAction: doAction },
              { id: `${i}.b`, name: 'Data 2', onAction: doAction },
              { id: `${i}.c`, name: 'Data 3', onAction: doAction }
            ]
          })
        );
      }
      return [];
    }
  });

  const doAction = (id: string) => {
    console.log('action', id);
  };

  // For the tree we can use react-arborist (MIT)
  return (
    <Container className="jp-TreeBrowserWidget" maxWidth="sm">
      <Tree data={query.data || []}>
        {({ node, style, dragHandle, tree }) => {
          return (
            <div
              style={style}
              ref={dragHandle}
              onClick={
                !node.isLeaf ? () => tree.get(node.id)?.toggle() : undefined
              }
            >
              <Stack direction={'row'} spacing={1} alignItems={'center'}>
                {!node.isLeaf ? (
                  <FontAwesomeIcon
                    fixedWidth
                    icon={node.isOpen ? faAngleDown : faAngleRight}
                  />
                ) : undefined}
                <div>
                  <Typography variant="body1">{node.data.name}</Typography>
                </div>
                <div>
                  {node.isLeaf ? (
                    node.data.onAction ? (
                      <IconButton
                        size={'small'}
                        onClick={() => node.data.onAction?.(node.id)}
                      >
                        <FontAwesomeIcon
                          fontSize={'inherit'}
                          fixedWidth
                          icon={faRightToBracket}
                        />
                      </IconButton>
                    ) : undefined
                  ) : undefined}
                </div>
              </Stack>
            </div>
          );
        }}
      </Tree>
    </Container>
  );
};

interface ITreeNode {
  id: string;
  name: string;
  onAction?: (id: string) => void;
  children?: ITreeNode[];
}
