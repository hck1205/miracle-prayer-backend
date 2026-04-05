CREATE TYPE "PostReportReason" AS ENUM (
  'NOT_A_PRAYER',
  'ABUSIVE_OR_HARASSING',
  'PROMOTIONAL_OR_OFF_TOPIC'
);

CREATE TABLE "post_reports" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "reason" "PostReportReason" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "post_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_reports_post_id_reporter_id_key"
ON "post_reports"("post_id", "reporter_id");

CREATE INDEX "post_reports_post_id_created_at_idx"
ON "post_reports"("post_id", "created_at" DESC);

CREATE INDEX "post_reports_reporter_id_created_at_idx"
ON "post_reports"("reporter_id", "created_at" DESC);

ALTER TABLE "post_reports"
ADD CONSTRAINT "post_reports_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_reports"
ADD CONSTRAINT "post_reports_reporter_id_fkey"
FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
