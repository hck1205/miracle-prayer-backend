ALTER TYPE "PostStatus" ADD VALUE 'DRAFT';

ALTER TABLE "posts"
ALTER COLUMN "published_at" DROP NOT NULL;

CREATE INDEX "posts_author_id_status_updated_at_idx"
ON "posts"("author_id", "status", "updated_at" DESC);
