import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { Panel } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { ReactWidget } from '@jupyterlab/apputils';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TreeBrowser } from './components/TreeBrowser';
import treeIconSvg from '@fortawesome/fontawesome-free/svgs/solid/sitemap.svg';

const treeIcon = new LabIcon({
  name: 'cdm-tree-browser:tree-icon',
  svgstr: treeIconSvg
});

/**
 * Initialization data for the cdm-tree-browser extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'cdm-tree-browser:plugin',
  description:
    'A JupyterLab extension for browsing file/data trees in KBase CDM JupyterLab.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension cdm-tree-browser is activated!');

    // Create QueryClient for React Query
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 1000 * 60 * 5 // 5 minutes
        }
      }
    });

    // Create a React widget wrapped with QueryClientProvider
    const widget = ReactWidget.create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(TreeBrowser, { jupyterApp: app })
      )
    );

    // Create a new panel for the left sidebar
    const panel = new Panel();
    panel.id = 'cdm-tree-browser-panel';
    panel.title.closable = true;
    panel.title.icon = treeIcon;
    panel.title.label = 'CDM Browser';

    // Add the React widget to the panel
    panel.addWidget(widget);

    // Add the panel to the left sidebar
    app.shell.add(panel, 'left', { rank: 1 });
  }
};

export default plugin;
