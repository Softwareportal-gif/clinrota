-- Discipline templates for medicine, physiotherapy, pharmacy and physician

-- associate programs, so an admin can create a program for any of them.

-- Fixed ids (like the original two) let code and seeds reference them;

-- ON CONFLICT keeps the migration safe to re-run.

INSERT INTO "DisciplineTemplate" ("id", "name", "description", "rubric", "extraLogFields", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Medicine (workplace-based assessment)',
    'Clinical assessment, reasoning, procedures and professional practice, each scored 1 (Below expectations) to 4 (Exceeds expectations).',
    '{"scaleLevels":[{"value":1,"label":"Below expectations"},{"value":2,"label":"Borderline"},{"value":3,"label":"Meets expectations"},{"value":4,"label":"Exceeds expectations"}],"dimensions":[{"key":"CLINICAL_ASSESSMENT","label":"Clinical assessment","subDimensions":[{"key":"HISTORY_TAKING","label":"History taking"},{"key":"PHYSICAL_EXAMINATION","label":"Physical examination"}]},{"key":"CLINICAL_REASONING","label":"Clinical reasoning","subDimensions":[{"key":"DIFFERENTIAL_DIAGNOSIS","label":"Differential diagnosis"},{"key":"INVESTIGATION_PLANNING","label":"Choice and interpretation of investigations"},{"key":"MANAGEMENT_PLANNING","label":"Management planning"}]},{"key":"PROCEDURES","label":"Procedural skills","subDimensions":[{"key":"PROCEDURAL_COMPETENCE","label":"Procedural competence"},{"key":"PATIENT_SAFETY","label":"Patient safety and infection control"}]},{"key":"PROFESSIONAL_PRACTICE","label":"Professional practice","subDimensions":[{"key":"COMMUNICATION","label":"Communication with patients and families"},{"key":"TEAMWORK","label":"Teamwork and handover"},{"key":"PROFESSIONALISM","label":"Professionalism and ethics"}]}]}'::jsonb,
    '[{"key":"differentialDiagnosis","label":"Differential diagnosis","type":"textarea"},{"key":"investigations","label":"Investigations requested and results","type":"textarea"}]'::jsonb,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "DisciplineTemplate" ("id", "name", "description", "rubric", "extraLogFields", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'Physiotherapy',
    'Assessment, analysis and planning, intervention and professional practice, each scored 1 (Below expectations) to 4 (Exceeds expectations).',
    '{"scaleLevels":[{"value":1,"label":"Below expectations"},{"value":2,"label":"Borderline"},{"value":3,"label":"Meets expectations"},{"value":4,"label":"Exceeds expectations"}],"dimensions":[{"key":"ASSESSMENT","label":"Assessment","subDimensions":[{"key":"SUBJECTIVE_ASSESSMENT","label":"Subjective assessment"},{"key":"OBJECTIVE_ASSESSMENT","label":"Objective (physical) assessment"},{"key":"OUTCOME_MEASURES","label":"Use of outcome measures"}]},{"key":"ANALYSIS_PLANNING","label":"Analysis and planning","subDimensions":[{"key":"CLINICAL_REASONING","label":"Clinical reasoning"},{"key":"GOAL_SETTING","label":"Goal setting with the patient"},{"key":"TREATMENT_PLANNING","label":"Treatment planning"}]},{"key":"INTERVENTION","label":"Intervention","subDimensions":[{"key":"TREATMENT_DELIVERY","label":"Safe and effective treatment delivery"},{"key":"PATIENT_EDUCATION","label":"Patient education and home programme"},{"key":"TREATMENT_EVALUATION","label":"Evaluating and progressing treatment"}]},{"key":"PROFESSIONAL_PRACTICE","label":"Professional practice","subDimensions":[{"key":"COMMUNICATION","label":"Communication with patients and families"},{"key":"DOCUMENTATION","label":"Documentation"},{"key":"PROFESSIONALISM","label":"Professionalism and ethics"}]}]}'::jsonb,
    '[{"key":"outcomeMeasures","label":"Outcome measures used","type":"textarea"},{"key":"treatmentProvided","label":"Treatment provided","type":"textarea"}]'::jsonb,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "DisciplineTemplate" ("id", "name", "description", "rubric", "extraLogFields", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'Pharmacy',
    'Pharmaceutical care, dispensing, patient counselling and professional practice, each scored 1 (Below expectations) to 4 (Exceeds expectations).',
    '{"scaleLevels":[{"value":1,"label":"Below expectations"},{"value":2,"label":"Borderline"},{"value":3,"label":"Meets expectations"},{"value":4,"label":"Exceeds expectations"}],"dimensions":[{"key":"PHARMACEUTICAL_CARE","label":"Pharmaceutical care","subDimensions":[{"key":"MEDICATION_HISTORY","label":"Medication history taking"},{"key":"MEDICATION_REVIEW","label":"Medication review"},{"key":"DRUG_RELATED_PROBLEMS","label":"Identifying drug-related problems"}]},{"key":"DISPENSING","label":"Dispensing and supply","subDimensions":[{"key":"PRESCRIPTION_SCREENING","label":"Prescription screening"},{"key":"DISPENSING_ACCURACY","label":"Dispensing accuracy"},{"key":"SAFE_HANDLING","label":"Safe handling and storage of medicines"}]},{"key":"PATIENT_COUNSELLING","label":"Patient counselling","subDimensions":[{"key":"MEDICINES_COUNSELLING","label":"Counselling on medicines use"},{"key":"ADHERENCE_SUPPORT","label":"Supporting adherence"}]},{"key":"PROFESSIONAL_PRACTICE","label":"Professional practice","subDimensions":[{"key":"INTERPROFESSIONAL_COMMUNICATION","label":"Communication with prescribers and the team"},{"key":"DOCUMENTATION","label":"Documenting interventions"},{"key":"PROFESSIONALISM","label":"Professionalism and ethics"}]}]}'::jsonb,
    '[{"key":"medicinesReviewed","label":"Medicines reviewed","type":"textarea"},{"key":"interventions","label":"Interventions recommended","type":"textarea"}]'::jsonb,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "DisciplineTemplate" ("id", "name", "description", "rubric", "extraLogFields", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Physician Associate',
    'Clinical assessment, reasoning, procedures and professional practice, each scored 1 (Below expectations) to 4 (Exceeds expectations).',
    '{"scaleLevels":[{"value":1,"label":"Below expectations"},{"value":2,"label":"Borderline"},{"value":3,"label":"Meets expectations"},{"value":4,"label":"Exceeds expectations"}],"dimensions":[{"key":"CLINICAL_ASSESSMENT","label":"Clinical assessment","subDimensions":[{"key":"HISTORY_TAKING","label":"History taking"},{"key":"PHYSICAL_EXAMINATION","label":"Physical examination"}]},{"key":"CLINICAL_REASONING","label":"Clinical reasoning","subDimensions":[{"key":"DIFFERENTIAL_DIAGNOSIS","label":"Differential diagnosis"},{"key":"INVESTIGATION_PLANNING","label":"Choice and interpretation of investigations"},{"key":"MANAGEMENT_PLANNING","label":"Management planning"}]},{"key":"PROCEDURES","label":"Procedural skills","subDimensions":[{"key":"PROCEDURAL_COMPETENCE","label":"Procedural competence"},{"key":"PATIENT_SAFETY","label":"Patient safety and infection control"}]},{"key":"PROFESSIONAL_PRACTICE","label":"Professional practice","subDimensions":[{"key":"COMMUNICATION","label":"Communication with patients and families"},{"key":"SCOPE_AND_ESCALATION","label":"Working within scope and escalating appropriately"},{"key":"PROFESSIONALISM","label":"Professionalism and ethics"}]}]}'::jsonb,
    '[{"key":"differentialDiagnosis","label":"Differential diagnosis","type":"textarea"},{"key":"proceduresPerformed","label":"Procedures performed","type":"textarea"}]'::jsonb,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
