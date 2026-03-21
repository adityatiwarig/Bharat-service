ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "proof_image" JSONB;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "proof_text" TEXT;
