import React, { FC, useEffect } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { TreeNodeType, TreeNodeMutator } from './sharedTypes';
import { treeQueryManager } from './treeQueryManager';

interface ITreeDataLoaderProps {
  treeData: TreeNodeType[];
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
}

/**
 * Tree Data Loader Component
 *
 * Invisible component that manages data loading for all configured providers.
 * Creates a RootDataLoader for each provider to handle initial data fetching.
 */
export const TreeDataLoader: FC<ITreeDataLoaderProps> = ({
  treeData,
  sessionContext,
  onNodeUpdate
}) => {
  return (
    <>
      {/* Create a data loader for each configured provider */}
      {treeQueryManager.providerNames.map(providerName => (
        <RootDataLoader
          key={providerName}
          providerName={providerName}
          treeData={treeData}
          sessionContext={sessionContext}
          onNodeUpdate={onNodeUpdate}
        />
      ))}
    </>
  );
};

interface IRootDataLoaderProps {
  providerName: string;
  treeData: TreeNodeType[];
  sessionContext: SessionContext;
  onNodeUpdate: TreeNodeMutator;
}

/**
 * Root Data Loader Component
 *
 * Handles initial data loading for a specific provider.
 * Calls the provider's fetchRootNodes function and updates the tree
 * when data is available.
 */
const RootDataLoader: FC<IRootDataLoaderProps> = ({
  providerName,
  treeData,
  sessionContext,
  onNodeUpdate
}) => {
  const rootNode = treeData.find(node => node.name === providerName);

  // Query to fetch root nodes for this provider
  const rootNodesQuery = useQuery({
    enabled: Boolean(rootNode && !rootNode.children),
    queryKey: ['tree-root', providerName],
    queryFn: () =>
      treeQueryManager.fetchRootNodesForProvider(providerName, sessionContext),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Handle data loading and errors
  useEffect(() => {
    if (!rootNode) {
      return;
    }

    if (rootNodesQuery.error) {
      console.error(
        `Failed to load root nodes for provider '${providerName}':`,
        rootNodesQuery.error
      );
    }

    if (rootNodesQuery.data && rootNode.children !== rootNodesQuery.data) {
      onNodeUpdate(rootNode.id, {
        ...rootNode,
        children: rootNodesQuery.data
      });
    }
  }, [
    rootNodesQuery.data,
    rootNodesQuery.error,
    rootNode,
    providerName,
    onNodeUpdate
  ]);

  return null; // This component renders nothing
};
