import json


def get_db_structure(with_schema=True, return_json=False):
    """
    Mock function that returns database structure for CDM tree browser.
    
    Args:
        with_schema (bool): Whether to include schema information
        return_json (bool): Whether to return JSON string instead of dict
    
    Returns:
        dict or str: Database structure with tables
    """
    mock_data = {
        "CDM_Database": [
            "person",
            "visit_occurrence", 
            "visit_detail",
            "condition_occurrence",
            "drug_exposure",
            "procedure_occurrence",
            "device_exposure",
            "measurement",
            "observation",
            "death",
            "note",
            "note_nlp",
            "specimen",
            "fact_relationship",
            "location",
            "care_site",
            "provider",
            "payer_plan_period",
            "cost",
            "drug_era",
            "dose_era",
            "condition_era"
        ],
        "Vocabulary": [
            "concept",
            "concept_ancestor",
            "concept_relationship", 
            "concept_synonym",
            "vocabulary",
            "domain",
            "concept_class",
            "relationship",
            "source_to_concept_map",
            "drug_strength"
        ],
        "Results": [
            "cohort",
            "cohort_definition",
            "cohort_definition_inclusion",
            "cohort_definition_inclusion_stats",
            "cohort_summary_stats",
            "cohort_censor_stats",
            "cohort_inclusion_result",
            "cohort_inclusion_stats"
        ],
        "Genomics": [
            "genomic_info",
            "variant_occurrence",
            "variant_annotation",
            "gene_expression",
            "mutation",
            "copy_number_variation",
            "structural_variant",
            "pharmacogenomics"
        ],
        "Clinical_Trials": [
            "trial",
            "trial_arm",
            "trial_participant",
            "trial_outcome",
            "adverse_event",
            "protocol_deviation",
            "enrollment_criteria"
        ],
        "Imaging": [
            "imaging_study",
            "imaging_series",
            "imaging_instance",
            "dicom_metadata",
            "image_annotation",
            "radiology_report"
        ],
        "Laboratory": [
            "lab_test_catalog",
            "lab_result",
            "lab_panel",
            "reference_range",
            "lab_quality_control",
            "microbiology_culture",
            "pathology_report"
        ],
        "Administrative": [
            "insurance_claim",
            "billing_code",
            "reimbursement",
            "facility_location",
            "staff_assignment",
            "system_audit_log",
            "data_quality_metrics"
        ],
        "Research_Datasets": [
            "biobank_specimen",
            "research_cohort",
            "study_protocol",
            "data_sharing_agreement",
            "ethics_approval",
            "publication_link",
            "external_dataset_link"
        ]
    }
    
    if return_json:
        return json.dumps(mock_data)
    return mock_data


def get_table_schema(database_name, table_name, return_json=False):
    """
    Mock function to get table schema information
    
    Args:
        database_name (str): Name of the database
        table_name (str): Name of the table
        return_json (bool): Whether to return JSON string
    
    Returns:
        dict or str: Table schema with columns and types
    """
    schema = {
        "database": database_name,
        "table": table_name,
        "columns": [
            {"name": f"{table_name}_id", "type": "bigint", "nullable": False, "primary_key": True},
            {"name": "person_id", "type": "bigint", "nullable": False, "foreign_key": "person.person_id"},
            {"name": "concept_id", "type": "integer", "nullable": False},
            {"name": "start_date", "type": "date", "nullable": False},
            {"name": "end_date", "type": "date", "nullable": True},
            {"name": "type_concept_id", "type": "integer", "nullable": False},
            {"name": "provider_id", "type": "integer", "nullable": True},
            {"name": "visit_occurrence_id", "type": "bigint", "nullable": True},
            {"name": "source_value", "type": "varchar(50)", "nullable": True},
            {"name": "created_date", "type": "timestamp", "nullable": False},
            {"name": "updated_date", "type": "timestamp", "nullable": True}
        ]
    }
    
    if return_json:
        return json.dumps(schema)
    return schema