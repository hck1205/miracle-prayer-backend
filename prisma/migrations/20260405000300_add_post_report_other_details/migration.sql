ALTER TYPE "PostReportReason" ADD VALUE 'OTHER';

ALTER TABLE "post_reports"
ADD COLUMN "details" TEXT;
