import React, { FC, useState } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { useQuery } from '@tanstack/react-query';
import { Typography, Button } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faTable } from '@fortawesome/free-solid-svg-icons';
import { BaseTreeNodeType, TreeNodeType, ITreeDataProvider } from '../sharedTypes';
import {
  parseKernelOutputJSON,
  queryKernel
} from '../components/kernelCommunication';

/** Schema structure returned by get_table_schema mock function */
type TableSchema = {
  database: string;
  table: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    primary_key?: boolean;
    foreign_key?: string;
  }>;
};

/** Displays table schema by calling get_table_schema mock function */
const TableSchemaDisplay: FC<{ node: TreeNodeType<'database' | 'table'>; sessionContext: SessionContext | null }> = ({ node, sessionContext }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const { data: schema, isLoading, error } = useQuery({
    queryKey: ['tableSchema', node.data?.database, node.name],
    queryFn: async () => {
      if (!sessionContext) throw new Error('No session context');
      
      // Setup mock functions then call get_table_schema with node's database and name
      const { data, error } = await queryKernel(
        `import cdm_tree_browser; get_db_structure, get_table_schema = cdm_tree_browser.get_cdm_methods(); result = get_table_schema("${node.data?.database}", "${node.name}", return_json=True); result`,
        sessionContext
      );
      
      if (error) {
        alert(`Table schema error: ${error.message}`);
        throw error;
      }
      
      const schema = parseKernelOutputJSON<TableSchema>(data);
      if (!schema) throw new Error('No schema data returned');
      
      return schema;
    },
    enabled: !!sessionContext && !!node.data?.database
  });

  if (isLoading) return <Typography>Loading schema...</Typography>;
  if (error) return (
    <Typography color="error">
      Error loading schema: {error instanceof Error ? error.message : 'Unknown error'}
    </Typography>
  );
  if (!schema) return <Typography>{node.name}</Typography>;

  return (
    <>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Database: {schema.database}
      </Typography>
      <Typography variant="body2" gutterBottom>
        Columns ({schema.columns?.length || 0}):
      </Typography>
      {schema.columns?.slice(0, showAllColumns ? undefined : 5).map((col: any, idx: number) => (
        <Typography key={idx} variant="body2" component="div" sx={{ ml: 2 }}>
          • {col.name} ({col.type})
        </Typography>
      ))}
      {schema.columns?.length > 5 && !showAllColumns && (
        <Button
          variant="text"
          size="small"
          onClick={() => setShowAllColumns(true)}
          sx={{ ml: 2, p: 0, minWidth: 'auto', textTransform: 'none' }}
        >
          ... and {schema.columns.length - 5} more columns
        </Button>
      )}
      {showAllColumns && schema.columns?.length > 5 && (
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

// CDM Database Provider - fetches database and table structure
export const cdmProvider: ITreeDataProvider<'database' | 'table'> = {
  name: 'CDM Data Store',
  supportedNodeTypes: ['database', 'table'],
  parentNodeTypes: ['database'],
  icon: <FontAwesomeIcon icon={faDatabase} />,
  nodeTypeIcons: {
    database: <FontAwesomeIcon icon={faDatabase} />,
    table: <FontAwesomeIcon icon={faTable} />
  },
  nodeTypeInfoRenderers: {
    table: (node, sessionContext) => <TableSchemaDisplay node={node} sessionContext={sessionContext} />
  },
  fetchRootNodes: async (sessionContext: SessionContext) => {
    const { data, error } = await queryKernel(
      'import cdm_tree_browser; get_db_structure, get_table_schema = cdm_tree_browser.get_cdm_methods(); result = get_db_structure(with_schema=False,return_json=True); result',
      sessionContext
    );

    if (error) {
      console.error('CDM provider: Failed to fetch root nodes:', error);
      alert(`CDM provider error: ${error.message}`);
      return [];
    }

    const databaseStructure =
      parseKernelOutputJSON<Record<string, string[]>>(data);

    if (!databaseStructure) {
      return [];
    }

    return Object.entries(databaseStructure).map(
      ([databaseId, tableNames]) => ({
        id: databaseId,
        name: databaseId,
        type: 'database' as const,
        children: tableNames.map(tableName => ({
          id: `${databaseId}//${tableName}`,
          name: tableName,
          type: 'table' as const,
          data: { database: databaseId }
        }))
      })
    );
  },
  fetchChildNodes: {
    table: async (node, sessionContext): Promise<BaseTreeNodeType<'database' | 'table'>[]> => [] // Tables currently have no sub-children
  }
};

