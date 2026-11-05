-- Agent readiness dimension (0-25). Nullable: checks stored before it existed have no value.
ALTER TABLE "Check" ADD COLUMN IF NOT EXISTS "agentScore" SMALLINT;
