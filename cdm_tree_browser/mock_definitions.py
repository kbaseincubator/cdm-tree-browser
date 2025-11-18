"""
Mock function implementations for CDM tree browser.

These functions mimic the behavior of berdl_notebook_utils.spark functions
for development and testing when a real BERDL environment is not available.
"""

import json
from .mock_data import MOCK_DATABASE_STRUCTURE, MOCK_GROUPS, MOCK_TABLE_COLUMNS


def get_table_schema(database_name, table_name, return_json=False):
    """
    Mock function to get table schema information.
    Returns list of column names to match actual kernel function behavior.

    Args:
        database_name (str): Name of the database
        table_name (str): Name of the table
        return_json (bool): Whether to return JSON string

    Returns:
        list or str: List of column names
    """
    # Generate column names based on table name
    columns = [col.format(table_name=table_name) for col in MOCK_TABLE_COLUMNS]

    if return_json:
        return json.dumps(columns)
    return columns


def get_my_groups(return_json=False):
    """
    Mock function that returns the list of groups/tenants the user belongs to.
    Mimics the berdl_notebook_utils.minio_governance.operations.get_my_groups() function.

    Args:
        return_json (bool): Whether to return JSON string instead of dict

    Returns:
        dict or str: User groups response with username, groups list, and group_count
    """
    if return_json:
        return json.dumps(MOCK_GROUPS)
    return MOCK_GROUPS


def get_databases(use_hms=True, return_json=True, filter_by_namespace=True):
    """
    Mock function that returns list of databases.
    Mimics the berdl_notebook_utils.spark.get_databases() function.

    Args:
        use_hms (bool): Whether to use HMS direct client (ignored in mock)
        return_json (bool): Whether to return JSON string instead of list
        filter_by_namespace (bool): Whether to filter by namespace (ignored in mock)

    Returns:
        list or str: List of database names
    """
    # Return all database names
    all_dbs = list(MOCK_DATABASE_STRUCTURE.keys())

    if return_json:
        return json.dumps(all_dbs)
    return all_dbs


def get_tables(database, use_hms=True, return_json=True):
    """
    Mock function that returns list of tables for a given database.
    Mimics the berdl_notebook_utils.spark.get_tables() function.

    Args:
        database (str): Name of the database
        use_hms (bool): Whether to use HMS direct client (ignored in mock)
        return_json (bool): Whether to return JSON string instead of list

    Returns:
        list or str: List of table names
    """
    tables = MOCK_DATABASE_STRUCTURE.get(database, [])

    if return_json:
        return json.dumps(tables)
    return tables


def get_namespace_prefix(tenant=None, return_json=False):
    """
    Mock function that returns namespace prefix for a tenant.
    Mimics the berdl_notebook_utils.minio_governance.operations.get_namespace_prefix() function.

    Args:
        tenant (str): Optional tenant name
        return_json (bool): Whether to return JSON string instead of dict

    Returns:
        dict or str: Namespace prefix information
    """
    result = {
        'username': 'mock_user',
        'user_namespace_prefix': 'u_mock_user__',
        'tenant': tenant,
        'tenant_namespace_prefix': f'{tenant.lower()}_' if tenant else None
    }

    if return_json:
        return json.dumps(result)
    return result