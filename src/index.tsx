import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget, ISessionContext } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React, { useMemo } from 'react';
import {
  useQuery,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import faTreeSVG from '@fortawesome/fontawesome-free/svgs/solid/tree.svg';
import { Tree } from 'react-arborist';
import {
  IMessage,
  IOPubMessageType
} from '@jupyterlab/services/lib/kernel/messages';

/**
 * Initialization data for the cdm-tree-browser extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'cdm-tree-browser:plugin',
  description:
    'A JupyterLab extension for browsing file/data trees in KBase CDM JupyterLab.',
  autoStart: true,
  activate: async (app, sessionContext) => {
    console.log('JupyterLab extension cdm-tree-browser is activated!');
    onActivate(app, sessionContext);
  },
  deactivate: () => {
    console.log('JupyterLab extension cdm-tree-browser was deactivated!');
  }
};

function onActivate(app: JupyterFrontEnd, sessionContext: ISessionContext) {
  const panel = new Panel();
  panel.id = 'cdm-tree-browser';
  panel.title.icon = {
    render: element => {
      element.innerHTML = faTreeSVG;
    }
  };
  panel.addWidget(new TreeBrowserWidget(sessionContext));
  app.shell.add(panel, 'left', { rank: 1 });
}

class TreeBrowserWidget extends ReactWidget {
  private sessionContext: ISessionContext;

  constructor(sessionContext: ISessionContext) {
    super();
    this.sessionContext = sessionContext;
  }

  render(): JSX.Element {
    // Extension React App setup (App.tsx equivalent)
    const queryClient = new QueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <TreeBrowser sessionContext={this.sessionContext} />
      </QueryClientProvider>
    );
  }
}

function TreeBrowser({ sessionContext }: { sessionContext: ISessionContext }) {
  // For API calls we can use react-query (instead of rtk-query as redux is overkill)
  const query = useQuery({
    queryKey: ['namespaces'],
    queryFn: async () =>
      callKernel('display_namespace_viewer()', sessionContext)
  });
  console.log('namespaces', query.status, query.data);
  const treeData = useMemo(() => {
    // perform any client-side transformations
    return [
      { id: '1', name: 'Empty' },
      { id: '2', name: 'Empty 2' },
      {
        id: '3',
        name: 'Some Data Source',
        children: [
          { id: 'c1', name: 'Data 1' },
          { id: 'c2', name: 'Data 2' },
          { id: 'c3', name: 'Data 3' }
        ]
      },
      {
        id: '4',
        name: 'Another Data Source',
        children: [
          { id: 'd1', name: 'Alice' },
          { id: 'd2', name: 'Bob' },
          { id: 'd3', name: 'Charlie' }
        ]
      }
    ]; // from query.data
  }, [query.data]);
  // For the tree we can use react-arborist
  return (
    <div className="jp-TreeBrowserWidget">
      <Tree initialData={treeData} />
    </div>
  );
}

const callKernel = async (
  code: string,
  sessionContext: ISessionContext,
  timeout = 1000
) => {
  if (!sessionContext.session?.kernel) {
    throw new Error('No kernel available');
  }

  const future = sessionContext.session.kernel.requestExecute({
    code: code,
    store_history: false
  });

  return new Promise(async (resolve, reject) => {
    const results: IMessage<IOPubMessageType>['content'][] = [];

    future.onIOPub = (msg: IMessage<IOPubMessageType>) => {
      const msgType = msg.header.msg_type;
      switch (msgType) {
        case 'execute_result':
          results.push(msg.content);
          break;
        default:
          break;
      }
      return;
    };

    future.onReply = msg => {
      if (msg.content.status === 'ok') {
        results.push(msg.content);
      } else {
        reject(
          new Error('Execution failed with status: ' + msg.content.status)
        );
      }
    };

    // Tiemout
    if (timeout) {
      setTimeout(() => {
        future.dispose();
        reject(new Error('callKernel timeout'));
      }, timeout);
    }

    await future.done;
    resolve(results);
  });
};

export default plugin;
