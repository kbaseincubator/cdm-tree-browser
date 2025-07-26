import React from 'react';
import { SessionContext } from '@jupyterlab/apputils';

/**
 * Base tree node type without provider-applied properties
 * This is what providers return from their fetch functions
 * @template T - Union type of supported node types (e.g., 'database' | 'table')
 */
export type BaseTreeNodeType<T extends string = string, D = any> = {
  /** Unique identifier for the node */
  id: string;
  /** Display name shown in the tree */
  name: string;
  /** Type of the node, used to determine child loading behavior */
  type: T;
  /** Child nodes - undefined means not loaded, empty array means loaded with no children */
  children?: BaseTreeNodeType<T, D>[];
  /** Custom icon to display for this node (optional override) */
  icon?: React.ReactNode;
  /** Arbitrary data for custom renderers (e.g., database name for table nodes) */
  data?: D;
};

/**
 * Full tree node type with provider-applied properties
 * This is what components receive after provider properties are applied
 * @template T - Union type of supported node types (e.g., 'database' | 'table')
 */
export type TreeNodeType<T extends string = string, D = any> = BaseTreeNodeType<
  T,
  D
> & {
  /** Custom icon to display for this node - always present after provider processing */
  icon: React.ReactNode;
  /** Whether this is a parent node - applied automatically based on provider configuration */
  isParentNode: boolean;
  /** Info renderer function - applied from provider configuration */
  infoRenderer?: (
    node: TreeNodeType<T, D>,
    sessionContext: SessionContext | null
  ) => React.ReactNode;
  /** Child nodes with provider properties applied */
  children?: TreeNodeType<T, D>[];
};

/**
 * Interface for data providers that supply tree data
 * Each provider represents a different data source (e.g., CDM database, file system, etc.)
 * @template T - Union type of node types this provider supports
 */
export interface ITreeDataProvider<T extends string = string> {
  /** Unique name for this provider */
  name: string;
  /** Array of node types this provider can handle */
  supportedNodeTypes: T[];
  /** Array of node types that are parent nodes (can have children) */
  parentNodeTypes: T[];
  /** Function to fetch the root-level nodes for this provider */
  fetchRootNodes: (
    sessionContext: SessionContext
  ) => Promise<BaseTreeNodeType<T>[]>;
  /** Map of node type to child fetching function */
  fetchChildNodes: {
    [K in T]?: (
      node: BaseTreeNodeType<K>,
      sessionContext: SessionContext
    ) => Promise<BaseTreeNodeType<T>[]>;
  };
  /** Custom icon for this provider's root node */
  icon?: React.ReactNode;
  /** Map of node type to default icon */
  nodeTypeIcons?: {
    [K in T]?: React.ReactNode;
  };
  /** Custom info panel renderers by node type - receives sessionContext for API calls */
  nodeTypeInfoRenderers?: {
    [K in T]?: (
      node: TreeNodeType<T>,
      sessionContext: SessionContext | null
    ) => React.ReactNode;
  };
}

/** Function type for updating nodes in the tree */
export type TreeNodeMutator = (id: string, updatedNode: TreeNodeType) => void;
