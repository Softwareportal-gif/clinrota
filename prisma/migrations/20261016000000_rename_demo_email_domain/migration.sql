-- Product renamed ClinRota -> Praxxt: move already-seeded demo accounts to the
-- new demo email domain so they match prisma/seed.ts. No-op on a fresh database.
UPDATE "User" SET "email" = replace("email", '@clinrota.demo', '@praxxt.demo') WHERE "email" LIKE '%@clinrota.demo';
