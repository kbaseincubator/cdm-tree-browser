import { faTree } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  panel.id = 'cdm-tree-browser';
  panel.title.icon = new IconWidget();
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
  // For API calls we can use react-query (instead of rtk-query as redux is overkill)
  const query = useQuery({
    queryKey: ['tree'],
    queryFn: async () => {
      // run fetch and return data here
    }
  });
  const treeItems = useMemo(() => {
    // perform any client-side transformations
    return []; // from query.data
  }, [query.data]);
  // For the tree we can use https://mui.com/x/api/tree-view/rich-tree-view/
  // We can share the same MUI theme with kbase/ui once kbase/assets is ready
  return (
    <div className="jp-TreeBrowserWidget">
      <RichTreeView items={treeItems} />
    </div>
  );
}

export default plugin;
