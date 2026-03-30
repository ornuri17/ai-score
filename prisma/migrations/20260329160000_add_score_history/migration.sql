-- Drop unique constraint on urlHash to allow multiple checks per URL (history)
DROP INDEX "Check_urlHash_key";

-- Add regular index on urlHash
CREATE INDEX "Check_urlHash_idx" ON "Check"("urlHash");
