-- Speed up feed body substring search for published posts.
-- pg_trgm lets PostgreSQL accelerate ILIKE/contains-style matching on text.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "mp_app_posts_published_body_trgm_idx"
ON "mp_app_posts"
USING GIN ("body" gin_trgm_ops)
WHERE "status" = 'PUBLISHED'::"mp_app_post_status"
  AND "published_at" IS NOT NULL;
