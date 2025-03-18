import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React, { useMemo } from 'react';
import {
  useQuery,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import faBoxesSVG from '@fortawesome/fontawesome-free/svgs/solid/boxes.svg';
import { Tree } from 'react-arborist';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDown,
  faAngleRight,
  faAnglesRight,
  faRightToBracket
} from '@fortawesome/free-solid-svg-icons';
import { Container, IconButton, Stack, Typography } from '@mui/material';

/**
 * Initialization data for the cdm-tree-browser extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'cdm-tree-browser:plugin',
  description:
    'A JupyterLab extension for browsing file/data trees in KBase CDM JupyterLab.',
  autoStart: true,
  activate: async app => {
    console.log('JupyterLab extension cdm-tree-browser is activated!');
    onActivate(app);
  },
  deactivate: () => {
    console.log('JupyterLab extension cdm-tree-browser was deactivated!');
  }
};

function onActivate(app: JupyterFrontEnd) {
  const panel = new Panel();
  panel.id = 'cdm-tree-browser';
  panel.title.icon = {
    render: element => {
      element.innerHTML = faBoxesSVG;
      element.setAttribute(
        'style',
        'align-items: center; display: flex; flex: 0 0 auto;'
      );
      element
        .getElementsByTagName('svg')[0]
        .setAttribute(
          'style',
          'display: block; height: auto; margin: 0 auto; width: 16px; fill: #616161;'
        );
    }
  };
  panel.addWidget(new TreeBrowserWidget());
  app.shell.add(panel, 'left', { rank: 1 });
}

class TreeBrowserWidget extends ReactWidget {
  constructor() {
    super();
  }

  render(): JSX.Element {
    // Extension React App setup (App.tsx equivalent)
    const queryClient = new QueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <TreeBrowser />
      </QueryClientProvider>
    );
  }
}

interface ITreeNode {
  id: string;
  name: string;
  onAction?: (id: string) => void;
  children?: ITreeNode[];
}

function TreeBrowser() {
  // For API calls we can use react-query (instead of rtk-query as redux is overkill)
  const query = useQuery({
    queryKey: ['namespaces'],
    queryFn: async () => 'someData'
  });
  const doAction = (id: string) => {
    console.log('action', id);
  };
  console.log('namespaces', query.status, query.data, query.error);
  const treeData: ITreeNode[] = useMemo(() => {
    // perform any client-side transformations
    return [
      { id: '1', name: 'Empty', icon: faAnglesRight, children: [] },
      { id: '2', name: 'Empty 2', icon: faAnglesRight, children: [] },
      {
        id: '3',
        name: 'Some Data Source',
        icon: faAnglesRight,
        children: [
          { id: 'c1', name: 'Data 1', onAction: doAction },
          { id: 'c2', name: 'Data 2', onAction: doAction },
          { id: 'c3', name: 'Data 3', onAction: doAction }
        ]
      },
      {
        id: '4',
        name: 'Another Data Source',
        icon: faAnglesRight,
        children: [
          { id: 'd1', name: 'Alice', onAction: doAction },
          { id: 'd2', name: 'Bob', onAction: doAction },
          { id: 'd3', name: 'Charlie', onAction: doAction }
        ]
      }
    ]; // from query.data
  }, [query.data]);
  // For the tree we can use react-arborist
  return (
    <Container className="jp-TreeBrowserWidget" maxWidth="sm">
      <Tree initialData={treeData}>
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
}

// https://github.com/jupyterlab/extension-examples/blob/main/kernel-messaging

export default plugin;
