import { faTree } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React from 'react';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

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

function onActivate(app: any) {
  const panel = new Panel();
  panel.id = 'Example-tab';
  panel.title.icon = new IconWidget(); // svg import
  panel.addWidget(new TreeBrowserWidget());
  app.shell.add(panel, 'left', { rank: 1 });
}

class IconWidget extends ReactWidget {
  render(): JSX.Element {
    return <FontAwesomeIcon icon={faTree} />;
  }
}

class TreeBrowserWidget extends ReactWidget {
  render(): JSX.Element {
    return <TreeBrowser />;
  }
}

function TreeBrowser() {
  // from docs
  const Tree_Example = [
    {
      id: 'grid',
      label: 'Data Grid',
      children: [
        { id: 'grid-community', label: '@mui/x-data-grid' },
        { id: 'grid-pro', label: '@mui/x-data-grid-pro' },
        { id: 'grid-premium', label: '@mui/x-data-grid-premium' }
      ]
    },
    {
      id: 'pickers',
      label: 'Date and Time Pickers',
      children: [
        { id: 'pickers-community', label: '@mui/x-date-pickers' },
        { id: 'pickers-pro', label: '@mui/x-date-pickers-pro' }
      ]
    },
    {
      id: 'charts',
      label: 'Charts',
      children: [{ id: 'charts-community', label: '@mui/x-charts' }]
    },
    {
      id: 'tree-view',
      label: 'Tree View',
      children: [{ id: 'tree-view-community', label: '@mui/x-tree-view' }]
    }
  ];
  return (
    <div className="jp-TreeBrowserWidget">
      <h2>Hello World!</h2>
      <RichTreeView items={Tree_Example} />
    </div>
  );
}

export default plugin;
