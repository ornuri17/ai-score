-- Initial schema for GradeByAI (matches prisma/schema.prisma).
-- Idempotent on purpose: production may already have some of these tables
-- (created by hand or by an older untracked migration), so every statement
-- is IF NOT EXISTS. Applied by the Lambda "migrate" action in CI.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Check" (
    "id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "score" SMALLINT NOT NULL,
    "crawlabilityScore" SMALLINT NOT NULL,
    "contentScore" SMALLINT NOT NULL,
    "technicalScore" SMALLINT NOT NULL,
    "qualityScore" SMALLINT NOT NULL,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '7 days',
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "languageDetected" TEXT,
    "referrerSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lead" (
    "id" UUID NOT NULL,
    "checkId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "phone" TEXT,
    "budgetRange" TEXT,
    "timeline" TEXT,
    "ctoStatus" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Check_domain_idx" ON "Check"("domain");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Check_expiresAt_idx" ON "Check"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Check_ipHash_idx" ON "Check"("ipHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Check_urlHash_idx" ON "Check"("urlHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_ctoStatus_idx" ON "Lead"("ctoStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_checkId_email_key" ON "Lead"("checkId", "email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_checkId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
