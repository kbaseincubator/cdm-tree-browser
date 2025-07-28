import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';

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
 * CDM Tree Browser JupyterLab extension plugin
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'cdm-tree-browser:plugin',
  description:
    'A JupyterLab extension for browsing file/data trees in KBase CDM JupyterLab.',
  autoStart: true,
  requires: [ILayoutRestorer, IStateDB],
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer,
    stateDB: IStateDB
  ) => {
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
        React.createElement(TreeBrowser, { jupyterApp: app, restorer, stateDB })
      )
    );

    // Create sidebar panel
    const panel = new Panel();
    panel.id = 'cdm-tree-browser-panel';
    panel.title.closable = true;
    panel.title.icon = treeIcon;
    panel.title.label = '';

    // Configure widget styling
    widget.addClass('jp-TreeBrowserWidget-root');
    widget.node.style.height = '100%';
    widget.node.style.overflow = 'hidden';

    // Assemble and register panel
    panel.addWidget(widget);
    app.shell.add(panel, 'left', { rank: 1 });
    restorer.add(panel, 'cdm-tree-browser-panel');
  }
};

export default plugin;
