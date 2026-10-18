-- Praxxt Anatomy: learner accounts, plans, subscriptions and payments.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'LEARNER';

-- CreateEnum
CREATE TYPE "AnatomyPlan" AS ENUM ('TRIAL', 'STUDENT', 'PROFESSIONAL', 'INSTITUTION');

-- CreateTable
CREATE TABLE "AnatomySubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "AnatomyPlan" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnatomySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnatomyPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "AnatomyPlan" NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnatomyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnatomySubscription_userId_key" ON "AnatomySubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnatomyPayment_reference_key" ON "AnatomyPayment"("reference");

-- CreateIndex
CREATE INDEX "AnatomyPayment_userId_idx" ON "AnatomyPayment"("userId");

-- AddForeignKey
ALTER TABLE "AnatomySubscription" ADD CONSTRAINT "AnatomySubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnatomyPayment" ADD CONSTRAINT "AnatomyPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The shared institution every self-signed-up learner belongs to.
INSERT INTO "Institution" ("id", "name", "createdAt", "updatedAt")
VALUES ('anatomy-learners', 'Praxxt Anatomy learners', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
