import React, { FC, useState } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { Typography, Button } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faTable,
  faUser,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import {
  BaseTreeNodeType,
  TreeNodeType,
  ITreeDataProvider
} from '../sharedTypes';
import {
  parseKernelOutputJSON,
  queryKernel
} from '../components/kernelCommunication';

/** Schema structure returned by get_table_schema function - simple array of column names */
type TableSchema = string[];

/** Response from get_my_groups function */
interface IGroupsResponse {
  username: string;
  groups: string[];
  group_count: number;
}

/** Response from get_namespace_prefix function */
interface INamespacePrefixResponse {
  username: string;
  user_namespace_prefix: string;
  tenant: string | null;
  tenant_namespace_prefix: string | null;
}

const PERSONAL_NODE_ID = '__user_databases__';

type BerdlNodeType = 'userData' | 'tenant' | 'database' | 'table';

const BERDL_METHODS_IMPORT =
  'import cdm_tree_browser; (get_table_schema, get_databases, get_tables, get_my_groups, get_namespace_prefix, using_mocks) = cdm_tree_browser.get_cdm_methods();';

/** Displays table schema by calling get_table_schema mock function */
const TableSchemaDisplay: FC<{
  node: TreeNodeType<BerdlNodeType>;
  sessionContext: SessionContext | null;
}> = ({ node, sessionContext }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const {
    data: schema,
    isLoading,
    error
  } = useQuery({
    queryKey: ['tableSchema', node.data?.database, node.name],
    queryFn: async () => {
      if (!sessionContext) {
        throw new Error('No session context');
      }

      // Setup mock functions then call get_table_schema with node's database and name
      const { data, error } = await queryKernel(
        `${BERDL_METHODS_IMPORT} result = get_table_schema("${node.data?.database}", "${node.name}", return_json=True); result`,
        sessionContext
      );

      if (error) {
        throw error;
      }

      const schema = parseKernelOutputJSON<TableSchema>(data);
      if (!schema) {
        throw new Error('No schema data returned');
      }

      return schema;
    },
    enabled: !!sessionContext && !!node.data?.database
  });

  if (isLoading) {
    return <Typography>Loading schema...</Typography>;
  }
  if (error) {
    return (
      <Typography color="error">
        Error loading schema:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </Typography>
    );
  }
  if (!schema) {
    return <Typography>{node.name}</Typography>;
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Database: {node.data?.database}
      </Typography>
      <Typography variant="body2" gutterBottom>
        Columns ({schema.length || 0}):
      </Typography>
      {schema
        ?.slice(0, showAllColumns ? undefined : 5)
        .map((columnName: string, idx: number) => (
          <Typography key={idx} variant="body2" component="div" sx={{ ml: 2 }}>
            • {columnName}
          </Typography>
        ))}
      {schema.length > 5 && !showAllColumns && (
        <Button
          variant="text"
          size="small"
          onClick={() => setShowAllColumns(true)}
          sx={{ ml: 2, p: 0, minWidth: 'auto', textTransform: 'none' }}
        >
          ... and {schema.length - 5} more columns
        </Button>
      )}
      {showAllColumns && schema.length > 5 && (
        <Button
          variant="text"
          size="small"
          onClick={() => setShowAllColumns(false)}
          sx={{ ml: 2, p: 0, minWidth: 'auto', textTransform: 'none' }}
        >
          Show less
        </Button>
      )}
    </>
  );
};

// BERDL Database Provider - fetches tenant, database and table structure
export const berdlProvider: ITreeDataProvider<BerdlNodeType> = {
  name: 'Lakehouse Data',
  supportedNodeTypes: ['userData', 'tenant', 'database', 'table'],
  parentNodeTypes: ['userData', 'tenant', 'database'],
  icon: <FontAwesomeIcon icon={faDatabase} />,
  nodeTypeIcons: {
    userData: <FontAwesomeIcon icon={faUser} />,
    tenant: <FontAwesomeIcon icon={faUsers} />,
    database: <FontAwesomeIcon icon={faDatabase} />,
    table: <FontAwesomeIcon icon={faTable} />
  },
  nodeTypeInfoRenderers: {
    table: (node, sessionContext) => (
      <TableSchemaDisplay node={node} sessionContext={sessionContext} />
    )
  },
  fetchRootNodes: async (sessionContext: SessionContext) => {
    const { data, error } = await queryKernel(
      `${BERDL_METHODS_IMPORT} result = get_my_groups(return_json=True); result`,
      sessionContext
    );

    if (error) {
      console.error('BERDL provider: Failed to fetch tenants:', error);
      throw error;
    }

    const groupsResponse = parseKernelOutputJSON<IGroupsResponse>(data);

    if (!groupsResponse) {
      return [];
    }

    const nodes: BaseTreeNodeType<'userData' | 'tenant'>[] = [];

    // Add personal databases node first
    nodes.push({
      id: PERSONAL_NODE_ID,
      name: 'My Data',
      type: 'userData'
    });

    // Add tenant/group nodes
    // Strip 'ro' suffix (read-only copies) and deduplicate
    if (groupsResponse.groups) {
      const processedGroups = [
        ...new Set(
          groupsResponse.groups.map(g => (g.endsWith('ro') ? g.slice(0, -2) : g))
        )
      ];
      for (const groupName of processedGroups) {
        nodes.push({
          id: `tenant://${groupName}`,
          name: groupName,
          type: 'tenant'
        });
      }
    }

    return nodes;
  },
  fetchChildNodes: {
    userData: async (
      node: BaseTreeNodeType<'userData'>,
      sessionContext: SessionContext
    ): Promise<BaseTreeNodeType<'database'>[]> => {
      const { data, error } = await queryKernel(
        `import json; ${BERDL_METHODS_IMPORT} databases = get_databases(use_hms=True, return_json=False, filter_by_namespace=True); prefix_response = get_namespace_prefix(tenant=None, return_json=False); result = {"databases": databases, "prefix": prefix_response}; json.dumps(result)`,
        sessionContext
      );

      if (error) {
        console.error('BERDL provider: Failed to fetch user databases:', error);
        throw error;
      }

      const response = parseKernelOutputJSON<{
        databases: string[];
        prefix: INamespacePrefixResponse;
      }>(data);

      if (!response || !response.databases) {
        return [];
      }

      const userPrefix = response.prefix.user_namespace_prefix;
      const filteredDatabases = userPrefix
        ? response.databases.filter(db => db.startsWith(userPrefix))
        : [];

      return filteredDatabases.map(databaseName => ({
        id: `${node.id}/${databaseName}`,
        name: databaseName,
        type: 'database' as const,
        data: { tenant: node.name }
      }));
    },
    tenant: async (
      node: BaseTreeNodeType<'tenant'>,
      sessionContext: SessionContext
    ): Promise<BaseTreeNodeType<'database'>[]> => {
      const { data, error } = await queryKernel(
        `import json; ${BERDL_METHODS_IMPORT} databases = get_databases(use_hms=True, return_json=False, filter_by_namespace=True); prefix_response = get_namespace_prefix(tenant="${node.name}", return_json=False); result = {"databases": databases, "prefix": prefix_response}; json.dumps(result)`,
        sessionContext
      );

      if (error) {
        console.error(
          `BERDL provider: Failed to fetch databases for tenant ${node.name}:`,
          error
        );
        throw error;
      }

      const response = parseKernelOutputJSON<{
        databases: string[];
        prefix: INamespacePrefixResponse;
      }>(data);

      if (!response || !response.databases) {
        return [];
      }

      const tenantPrefix = response.prefix.tenant_namespace_prefix;
      const filteredDatabases = tenantPrefix
        ? response.databases.filter(db => db.startsWith(tenantPrefix))
        : [];

      return filteredDatabases.map(databaseName => ({
        id: `${node.id}/${databaseName}`,
        name: databaseName,
        type: 'database' as const,
        data: { tenant: node.name }
      }));
    },
    database: async (
      node: BaseTreeNodeType<'database'>,
      sessionContext: SessionContext
    ): Promise<BaseTreeNodeType<'table'>[]> => {
      const { data, error } = await queryKernel(
        `${BERDL_METHODS_IMPORT} result = get_tables("${node.name}", use_hms=True, return_json=True); result`,
        sessionContext
      );

      if (error) {
        console.error(
          `BERDL provider: Failed to fetch tables for database ${node.name}:`,
          error
        );
        throw error;
      }

      const tables = parseKernelOutputJSON<string[]>(data);

      if (!tables) {
        return [];
      }

      return tables.map(tableName => ({
        id: `${node.id}/${tableName}`,
        name: tableName,
        type: 'table' as const,
        data: { tenant: node.data?.tenant, database: node.name }
      }));
    },
    table: async (): Promise<BaseTreeNodeType<'table'>[]> => []
  }
};
