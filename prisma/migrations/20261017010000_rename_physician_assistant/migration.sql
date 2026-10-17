-- "Physician Assistant" is the title most programs use for this profession.
UPDATE "DisciplineTemplate"
SET "name" = 'Physician Assistant', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '00000000-0000-0000-0000-000000000006' AND "name" = 'Physician Associate';
