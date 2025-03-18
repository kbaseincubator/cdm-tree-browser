import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import faBoxesSVG from '@fortawesome/fontawesome-free/svgs/solid/boxes.svg';
import { TreeBrowser } from './treeBrowser';
import { VirtualElement } from '@lumino/virtualdom';

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
    const panel = new Panel();
    panel.id = 'cdm-tree-browser';
    panel.title.icon = browserIcon;
    panel.addWidget(new TreeBrowserWidget(app));
    app.shell.add(panel, 'left', { rank: 1 });
  },
  deactivate: () => {
    console.log('JupyterLab extension cdm-tree-browser was deactivated!');
  }
};

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

const browserIcon: VirtualElement.IRenderer = {
  render: host => {
    host.innerHTML = faBoxesSVG;
    host.setAttribute(
      'style',
      'align-items: center; display: flex; flex: 0 0 auto;'
    );
    host
      .getElementsByTagName('svg')[0]
      .setAttribute(
        'style',
        'display: block; height: auto; margin: 0 auto; width: 16px; fill: #616161;'
      );
  }
};

export default plugin;
