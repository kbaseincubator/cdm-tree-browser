def get_cdm_methods():
    """
    Returns BERDL data access methods.
    Tries to import from BERDL (berdl_notebook_utils) first,
    falls back to old CDM (spark.data_store), then to mock functions.
    Returns (get_db_structure, get_table_schema, get_databases, get_tables, get_my_groups, get_namespace_prefix, using_mocks)
    """
    # Try BERDL notebook environment first
    try:
        from berdl_notebook_utils.spark import (
            get_databases,
            get_tables,
            get_table_schema,
            get_db_structure as _get_db_structure,
        )
        from berdl_notebook_utils.minio_governance.operations import (
            get_my_groups as _get_my_groups,
            get_namespace_prefix as _get_namespace_prefix,
        )
        print("Using BERDL berdl_notebook_utils functions")

        # Wrap get_db_structure to handle BERDL's filter_by_namespace parameter
        # Default to False to show all databases the user has access to
        def get_db_structure(with_schema=False, return_json=True):
            return _get_db_structure(
                with_schema=with_schema,
                use_hms=True,
                return_json=return_json,
                filter_by_namespace=False
            )

        # Wrap get_my_groups to add return_json parameter for consistency
        def get_my_groups(return_json=False):
            import json
            result = _get_my_groups()
            if return_json:
                return json.dumps(result)
            return result

        def get_namespace_prefix(tenant=None, return_json=False):
            import json
            result = _get_namespace_prefix(tenant=tenant)
            result_dict = {
                'username': result.username,
                'user_namespace_prefix': result.user_namespace_prefix,
                'tenant': result.tenant if hasattr(result, 'tenant') else None,
                'tenant_namespace_prefix': result.tenant_namespace_prefix if hasattr(result, 'tenant_namespace_prefix') else None,
            }
            if return_json:
                return json.dumps(result_dict)
            return result_dict

        return get_db_structure, get_table_schema, get_databases, get_tables, get_my_groups, get_namespace_prefix, False
    except ImportError as e:
        print(f"BERDL import failed: {e}")
        print("Using mock functions")

    from .mock_definitions import get_db_structure, get_table_schema, get_databases, get_tables, get_my_groups, get_namespace_prefix

    return get_db_structure, get_table_schema, get_databases, get_tables, get_my_groups, get_namespace_prefix, True