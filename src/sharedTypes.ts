import React from 'react';
import { SessionContext } from '@jupyterlab/apputils';

/**
 * Represents a single node in the tree structure
 * @template T - Union type of supported node types (e.g., 'database' | 'table')
 */
export type TreeNodeType<T extends string = string, D = any> = {
  /** Unique identifier for the node */
  id: string;
  /** Display name shown in the tree */
  name: string;
  /** Type of the node, used to determine child loading behavior */
  type: T;
  /** Whether this node contains actionable content */
  hasContent?: boolean;
  /** Child nodes - undefined means not loaded, empty array means loaded with no children */
  children?: TreeNodeType[];
  /** Custom icon to display for this node */
  icon?: React.ReactNode;
  /** Whether this node has children - true = has children, false = no children, undefined = unknown */
  hasChildren?: boolean;
  /** Arbitrary data for custom renderers (e.g., database name for table nodes) */
  data?: D;
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
  /** Function to fetch the root-level nodes for this provider */
  fetchRootNodes: (sessionContext: SessionContext) => Promise<TreeNodeType[]>;
  /** Map of node type to child fetching function */
  fetchChildNodes: {
    [K in T]?: (
      node: TreeNodeType<K>,
      sessionContext: SessionContext
    ) => Promise<TreeNodeType<T>[]>;
  };
  /** Custom icon for this provider's root node */
  icon?: React.ReactNode;
  /** Map of node type to default icon */
  nodeTypeIcons?: {
    [K in T]?: React.ReactNode;
  };
  /** Custom info panel renderers by node type - receives sessionContext for API calls */
  nodeTypeInfoRenderers?: {
    [K in T]?: (node: TreeNodeType<K>, sessionContext: SessionContext | null) => React.ReactNode;
  };
}

/** Function type for updating nodes in the tree */
export type TreeNodeMutator = (id: string, updatedNode: TreeNodeType) => void;