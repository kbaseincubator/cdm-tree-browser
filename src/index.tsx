import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ReactWidget,
  SessionContext
  // SessionContextDialogs
} from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React, { FC, useEffect, useMemo, useState } from 'react';
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
  faRightToBracket
} from '@fortawesome/free-solid-svg-icons';
import { Container, IconButton, Stack, Typography } from '@mui/material';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { IOutput } from '@jupyterlab/nbformat';

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
  panel.addWidget(new TreeBrowserWidget(app));
  app.shell.add(panel, 'left', { rank: 1 });
}

class TreeBrowserWidget extends ReactWidget {
  private app: JupyterFrontEnd;

  constructor(app: JupyterFrontEnd) {
    super();
    this.app = app;
  }

  render(): JSX.Element {
    // Extension React App setup (App.tsx equivalent)
    const queryClient = new QueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <TreeBrowser jupyterApp={this.app} />
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

const TreeBrowser: FC<{ jupyterApp: JupyterFrontEnd }> = ({ jupyterApp }) => {
  const sessionContext = useSessionContext(jupyterApp);
  // For API calls we can use react-query (instead of rtk-query as redux is overkill)
  const query = useQuery({
    queryKey: ['namespaces'],
    enabled: !!sessionContext && jupyterApp.serviceManager.isReady,
    queryFn: () =>
      queryKernel(
        "import json\njson.dumps(['alexey', 'alexeyranjan', 'alexeyv8', 'credit_engine', 'default', 'enigma', 'fastgenomics', 'filipedb', 'gazi_db', 'img', 'janaka_db', 'modelseed_biochemistry', 'ontology_data', 'pangenome_ke', 'ranjandb', 'scarecrow_db', 'semsql', 'test'])",
        sessionContext!
      )
  });
  const doAction = (id: string) => {
    console.log('action', id);
  };
  console.log('namespaces', query.status, query.data, query.error);
  console.log({ sessionContext });
  const treeData: ITreeNode[] = useMemo(() => {
    // perform any client-side transformations
    if (
      query?.data?.data &&
      typeof query.data.data === 'object' &&
      'text/plain' in query.data.data
    ) {
      return (
        JSON.parse(
          (query.data.data['text/plain'] as string).replace(/^'|'$/g, '')
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
  }, [query.data]);
  // For the tree we can use react-arborist (MIT)
  return (
    <Container className="jp-TreeBrowserWidget" maxWidth="sm">
      <Tree data={treeData}>
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

// Based on https://github.com/jupyterlab/extension-examples/blob/main/kernel-messaging

const useSessionContext = (app: JupyterFrontEnd) => {
  const [sc, setSc] = useState<SessionContext | undefined>();
  useEffect(() => {
    const manager = app.serviceManager;
    const sessionContext = new SessionContext({
      sessionManager: manager.sessions,
      specsManager: manager.kernelspecs,
      name: 'cdm-tree-browser'
    });
    void sessionContext
      .initialize()
      .then(async value => {
        if (value) {
          // const sessionContextDialogs = new SessionContextDialogs({});
          // await sessionContextDialogs.selectKernel(sessionContext); // Show kernel selection dialog
          await sessionContext.changeKernel({ name: 'python3' }); // skip dialog
          setSc(sessionContext);
        }
      })
      .catch(reason => {
        console.error(`Failed to initialize the session.\n${reason}`);
      });
    return () => {
      sessionContext.dispose();
      setSc(undefined);
    };
  }, [app.shell.id]);
  return sc;
};

const queryKernel = async (code: string, sessionContext: SessionContext) => {
  const kernel = sessionContext?.session?.kernel;
  if (!kernel) {
    throw new Error('kernel DNE');
  }
  const future: Kernel.IFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > = kernel.requestExecute({ code });
  const output = await new Promise<IOutput>(resolve => {
    future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      const msgType = msg.header.msg_type;
      switch (msgType) {
        case 'execute_result':
        case 'display_data':
        case 'update_display_data':
          resolve(msg.content as IOutput);
          break;
        default:
          break;
      }
    };
  });

  future.dispose();

  return output;
};

export default plugin;
