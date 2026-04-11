CREATE TABLE "mp_app_post_favorites" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mp_app_post_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mp_app_post_favorites_post_id_user_id_key"
ON "mp_app_post_favorites"("post_id", "user_id");

CREATE INDEX "mp_app_post_favorites_user_id_created_at_idx"
ON "mp_app_post_favorites"("user_id", "created_at" DESC);

CREATE INDEX "mp_app_post_favorites_post_id_created_at_idx"
ON "mp_app_post_favorites"("post_id", "created_at" DESC);

ALTER TABLE "mp_app_post_favorites"
ADD CONSTRAINT "mp_app_post_favorites_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "mp_app_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mp_app_post_favorites"
ADD CONSTRAINT "mp_app_post_favorites_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "mp_app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
