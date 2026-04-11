CREATE SEQUENCE "mp_app_posts_post_number_seq";

ALTER TABLE "mp_app_posts"
ADD COLUMN "post_number" INTEGER;

WITH numbered_posts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS post_number
  FROM "mp_app_posts"
)
UPDATE "mp_app_posts" AS post
SET "post_number" = numbered_posts.post_number
FROM numbered_posts
WHERE post.id = numbered_posts.id;

SELECT setval(
  '"mp_app_posts_post_number_seq"',
  COALESCE((SELECT MAX("post_number") FROM "mp_app_posts"), 0) + 1,
  false
);

ALTER TABLE "mp_app_posts"
ALTER COLUMN "post_number" SET DEFAULT nextval('"mp_app_posts_post_number_seq"');

ALTER TABLE "mp_app_posts"
ALTER COLUMN "post_number" SET NOT NULL;

ALTER TABLE "mp_app_posts"
ADD CONSTRAINT "mp_app_posts_post_number_key" UNIQUE ("post_number");
