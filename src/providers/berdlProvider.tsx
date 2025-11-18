import React, { FC, useState } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { Typography, Button } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faTable,
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

const BERDL_METHODS_IMPORT =
  'import cdm_tree_browser; (get_table_schema, get_databases, get_tables, get_my_groups, get_namespace_prefix, using_mocks) = cdm_tree_browser.get_cdm_methods();';

/** Displays table schema by calling get_table_schema mock function */
const TableSchemaDisplay: FC<{
  node: TreeNodeType<'tenant' | 'database' | 'table'>;
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
export const berdlProvider: ITreeDataProvider<'tenant' | 'database' | 'table'> =
  {
    name: 'Lakehouse Data',
    supportedNodeTypes: ['tenant', 'database', 'table'],
    parentNodeTypes: ['tenant', 'database'],
    icon: <FontAwesomeIcon icon={faDatabase} />,
    nodeTypeIcons: {
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

      if (!groupsResponse || !groupsResponse.groups) {
        return [];
      }

      return groupsResponse.groups.map(groupName => ({
        id: `tenant://${groupName}`,
        name: groupName,
        type: 'tenant' as const
      }));
    },
    fetchChildNodes: {
      tenant: async (
        node: BaseTreeNodeType<'tenant' | 'database' | 'table'>,
        sessionContext: SessionContext
      ): Promise<BaseTreeNodeType<'tenant' | 'database' | 'table'>[]> => {
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
          prefix: { tenant_namespace_prefix: string };
        }>(data);

        if (!response || !response.databases) {
          return [];
        }

        const tenantPrefix = response.prefix.tenant_namespace_prefix;
        const filteredDatabases = response.databases.filter(db =>
          db.startsWith(tenantPrefix)
        );

        return filteredDatabases.map(databaseName => ({
          id: `${node.id}/${databaseName}`,
          name: databaseName,
          type: 'database' as const,
          data: { tenant: node.name }
        }));
      },
      database: async (
        node: BaseTreeNodeType<'tenant' | 'database' | 'table'>,
        sessionContext: SessionContext
      ): Promise<BaseTreeNodeType<'tenant' | 'database' | 'table'>[]> => {
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
      table: async (): Promise<
        BaseTreeNodeType<'tenant' | 'database' | 'table'>[]
      > => []
    }
  };
