def get_cdm_methods():
    """
    Returns CDM data access methods.
    Returns real spark.data_store functions if available, otherwise mock functions.
    Returns (get_db_structure, get_table_schema, using_mocks)
    """
    # Try to import from spark.data_store first
    try:
        from spark.data_store import (
            get_databases,
            get_tables,
            get_table_schema,
            get_db_structure,
        )
        print("Using real spark.data_store functions")
        return get_db_structure, get_table_schema, False
    except ImportError:
        print("spark.data_store not available, using mock functions")
    
    # Import mock functions from separate file
    from .mock_definitions import get_db_structure, get_table_schema
    
    return get_db_structure, get_table_schema, True