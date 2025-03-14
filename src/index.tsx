import { faTree } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React from 'react';
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
  return (
    <div className="jp-TreeBrowserWidget">
      <h2>Hello World!</h2>
    </div>
  );
}

export default plugin;
