import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { INotebookTracker } from '@jupyterlab/notebook';

import { Panel } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { ReactWidget } from '@jupyterlab/apputils';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TreeBrowser } from './components/TreeBrowser';
import treeIconSvg from '@fortawesome/fontawesome-free/svgs/solid/sitemap.svg';

const EXTENSION_ID = 'cdm-tree-browser';
const PLUGIN_ID = `${EXTENSION_ID}:plugin`;
const TREE_ICON_ID = `${EXTENSION_ID}:tree-icon`;
const PANEL_ID = `${EXTENSION_ID}-panel`;

const treeIcon = new LabIcon({
  name: TREE_ICON_ID,
  svgstr: treeIconSvg
});

/**
 * CDM Tree Browser JupyterLab extension plugin
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'A JupyterLab extension for browsing file/data trees in KBase CDM JupyterLab.',
  autoStart: true,
  requires: [ILayoutRestorer, IStateDB, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer,
    stateDB: IStateDB,
    notebookTracker: INotebookTracker
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
        React.createElement(TreeBrowser, {
          jupyterApp: app,
          restorer,
          stateDB,
          notebookTracker
        })
      )
    );

    // Create sidebar panel
    const panel = new Panel();
    panel.id = PANEL_ID;
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
    restorer.add(panel, PANEL_ID);
  }
};

export default plugin;
