"""
Mock data for CDM tree browser development and testing.

This module contains sample database structures and tenant configurations
used when real BERDL or CDM environments are not available.
"""

# Mock tenant/group configuration
MOCK_GROUPS = {
    "username": "mock_user",
    "groups": ["KBase", "Demo"],
    "group_count": 2
}

# Mock database structure with tables
# Database names follow the pattern: {tenant}_{database_name}
MOCK_DATABASE_STRUCTURE = {
    "kbase_cdm_database": [
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
    "kbase_vocabulary": [
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
    "kbase_results": [
        "cohort",
        "cohort_definition",
        "cohort_definition_inclusion",
        "cohort_definition_inclusion_stats",
        "cohort_summary_stats",
        "cohort_censor_stats",
        "cohort_inclusion_result",
        "cohort_inclusion_stats"
    ],
    "kbase_genomics": [
        "genomic_info",
        "variant_occurrence",
        "variant_annotation",
        "gene_expression",
        "mutation",
        "copy_number_variation",
        "structural_variant",
        "pharmacogenomics"
    ],
    "demo_clinical_trials": [
        "trial",
        "trial_arm",
        "trial_participant",
        "trial_outcome",
        "adverse_event",
        "protocol_deviation",
        "enrollment_criteria"
    ],
    "demo_imaging": [
        "imaging_study",
        "imaging_series",
        "imaging_instance",
        "dicom_metadata",
        "image_annotation",
        "radiology_report"
    ],
    "demo_laboratory": [
        "lab_test_catalog",
        "lab_result",
        "lab_panel",
        "reference_range",
        "lab_quality_control",
        "microbiology_culture",
        "pathology_report"
    ],
    "demo_administrative": [
        "insurance_claim",
        "billing_code",
        "reimbursement",
        "facility_location",
        "staff_assignment",
        "system_audit_log",
        "data_quality_metrics"
    ],
    "demo_research_datasets": [
        "biobank_specimen",
        "research_cohort",
        "study_protocol",
        "data_sharing_agreement",
        "ethics_approval",
        "publication_link",
        "external_dataset_link"
    ]
}

# Mock table schema - generates sample columns for any table
MOCK_TABLE_COLUMNS = [
    "{table_name}_id",
    "person_id",
    "concept_id",
    "start_date",
    "end_date",
    "type_concept_id",
    "provider_id",
    "visit_occurrence_id",
    "source_value",
    "created_date",
    "updated_date"
]
