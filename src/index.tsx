import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import faTreeSVG from '@fortawesome/fontawesome-free/svgs/solid/tree.svg';
import { Tree } from 'react-arborist';

/**
 * Initialization data for the cdm-tree-browser extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'cdm-tree-browser:plugin',
  description:
    'A JupyterLab extension for browsing file/data trees in KBase CDM JupyterLab.',
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
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
      element.innerHTML = faTreeSVG;
    }
  };
  panel.addWidget(new TreeBrowserWidget());
  app.shell.add(panel, 'left', { rank: 1 });
}

class TreeBrowserWidget extends ReactWidget {
  render(): JSX.Element {
    return <TreeBrowser />;
  }
}

function TreeBrowser() {
  // For API calls we can use react-query (instead of rtk-query as redux is overkill)
  const query = useQuery({
    queryKey: ['tree'],
    queryFn: async () => {
      // run fetch and return data here
    }
  });
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

export default plugin;
