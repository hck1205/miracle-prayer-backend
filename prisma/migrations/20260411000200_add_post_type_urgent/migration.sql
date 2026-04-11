CREATE TYPE "mp_app_post_type" AS ENUM ('URGENT');

ALTER TABLE "mp_app_posts"
ADD COLUMN "type" "mp_app_post_type";

CREATE INDEX "mp_app_posts_author_id_type_status_published_at_idx"
ON "mp_app_posts"("author_id", "type", "status", "published_at" DESC);
