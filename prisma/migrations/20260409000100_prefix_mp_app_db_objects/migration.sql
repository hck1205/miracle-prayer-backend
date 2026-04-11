-- Rename physical PostgreSQL objects so this service can share one database
-- with other services without table, enum, index, or constraint name collisions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentVisibility') THEN
    ALTER TYPE "ContentVisibility" RENAME TO "mp_app_content_visibility";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostStatus') THEN
    ALTER TYPE "PostStatus" RENAME TO "mp_app_post_status";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommentStatus') THEN
    ALTER TYPE "CommentStatus" RENAME TO "mp_app_comment_status";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommentPolicy') THEN
    ALTER TYPE "CommentPolicy" RENAME TO "mp_app_comment_policy";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReactionType') THEN
    ALTER TYPE "ReactionType" RENAME TO "mp_app_reaction_type";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostReportReason') THEN
    ALTER TYPE "PostReportReason" RENAME TO "mp_app_post_report_reason";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserType') THEN
    ALTER TYPE "UserType" RENAME TO "mp_app_user_type";
  END IF;
END $$;

ALTER TABLE IF EXISTS "users" RENAME TO "mp_app_users";
ALTER TABLE IF EXISTS "posts" RENAME TO "mp_app_posts";
ALTER TABLE IF EXISTS "post_reports" RENAME TO "mp_app_post_reports";
ALTER TABLE IF EXISTS "post_reactions" RENAME TO "mp_app_post_reactions";
ALTER TABLE IF EXISTS "comments" RENAME TO "mp_app_comments";
ALTER TABLE IF EXISTS "comment_reactions" RENAME TO "mp_app_comment_reactions";

ALTER INDEX IF EXISTS "users_email_key" RENAME TO "mp_app_users_email_key";
ALTER INDEX IF EXISTS "users_google_subject_key" RENAME TO "mp_app_users_google_subject_key";
ALTER INDEX IF EXISTS "posts_author_id_created_at_idx" RENAME TO "mp_app_posts_author_id_created_at_idx";
ALTER INDEX IF EXISTS "posts_author_id_status_updated_at_idx" RENAME TO "mp_app_posts_author_id_status_updated_at_idx";
ALTER INDEX IF EXISTS "posts_status_published_at_idx" RENAME TO "mp_app_posts_status_published_at_idx";
ALTER INDEX IF EXISTS "posts_status_published_at_id_idx" RENAME TO "mp_app_posts_status_published_at_id_idx";
ALTER INDEX IF EXISTS "posts_visibility_status_published_at_idx" RENAME TO "mp_app_posts_visibility_status_published_at_idx";
ALTER INDEX IF EXISTS "post_reports_post_id_reporter_id_key" RENAME TO "mp_app_post_reports_post_id_reporter_id_key";
ALTER INDEX IF EXISTS "post_reports_post_id_created_at_idx" RENAME TO "mp_app_post_reports_post_id_created_at_idx";
ALTER INDEX IF EXISTS "post_reports_reporter_id_created_at_idx" RENAME TO "mp_app_post_reports_reporter_id_created_at_idx";
ALTER INDEX IF EXISTS "post_reactions_post_id_user_id_key" RENAME TO "mp_app_post_reactions_post_id_user_id_key";
ALTER INDEX IF EXISTS "post_reactions_post_id_type_idx" RENAME TO "mp_app_post_reactions_post_id_type_idx";
ALTER INDEX IF EXISTS "post_reactions_user_id_created_at_idx" RENAME TO "mp_app_post_reactions_user_id_created_at_idx";
ALTER INDEX IF EXISTS "comments_post_id_created_at_idx" RENAME TO "mp_app_comments_post_id_created_at_idx";
ALTER INDEX IF EXISTS "comments_post_id_parent_id_created_at_idx" RENAME TO "mp_app_comments_post_id_parent_id_created_at_idx";
ALTER INDEX IF EXISTS "comments_post_id_root_comment_id_parent_id_created_at_idx" RENAME TO "mp_app_comments_post_root_parent_created_at_idx";
ALTER INDEX IF EXISTS "comments_author_id_created_at_idx" RENAME TO "mp_app_comments_author_id_created_at_idx";
ALTER INDEX IF EXISTS "comment_reactions_comment_id_user_id_key" RENAME TO "mp_app_comment_reactions_comment_id_user_id_key";
ALTER INDEX IF EXISTS "comment_reactions_comment_id_type_idx" RENAME TO "mp_app_comment_reactions_comment_id_type_idx";
ALTER INDEX IF EXISTS "comment_reactions_user_id_created_at_idx" RENAME TO "mp_app_comment_reactions_user_id_created_at_idx";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
    ALTER TABLE "mp_app_users"
      RENAME CONSTRAINT "users_pkey" TO "mp_app_users_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_pkey') THEN
    ALTER TABLE "mp_app_posts"
      RENAME CONSTRAINT "posts_pkey" TO "mp_app_posts_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reports_pkey') THEN
    ALTER TABLE "mp_app_post_reports"
      RENAME CONSTRAINT "post_reports_pkey" TO "mp_app_post_reports_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reactions_pkey') THEN
    ALTER TABLE "mp_app_post_reactions"
      RENAME CONSTRAINT "post_reactions_pkey" TO "mp_app_post_reactions_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_pkey') THEN
    ALTER TABLE "mp_app_comments"
      RENAME CONSTRAINT "comments_pkey" TO "mp_app_comments_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reactions_pkey') THEN
    ALTER TABLE "mp_app_comment_reactions"
      RENAME CONSTRAINT "comment_reactions_pkey" TO "mp_app_comment_reactions_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_author_id_fkey') THEN
    ALTER TABLE "mp_app_posts"
      RENAME CONSTRAINT "posts_author_id_fkey" TO "mp_app_posts_author_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reports_post_id_fkey') THEN
    ALTER TABLE "mp_app_post_reports"
      RENAME CONSTRAINT "post_reports_post_id_fkey" TO "mp_app_post_reports_post_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reports_reporter_id_fkey') THEN
    ALTER TABLE "mp_app_post_reports"
      RENAME CONSTRAINT "post_reports_reporter_id_fkey" TO "mp_app_post_reports_reporter_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reactions_post_id_fkey') THEN
    ALTER TABLE "mp_app_post_reactions"
      RENAME CONSTRAINT "post_reactions_post_id_fkey" TO "mp_app_post_reactions_post_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reactions_user_id_fkey') THEN
    ALTER TABLE "mp_app_post_reactions"
      RENAME CONSTRAINT "post_reactions_user_id_fkey" TO "mp_app_post_reactions_user_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_post_id_fkey') THEN
    ALTER TABLE "mp_app_comments"
      RENAME CONSTRAINT "comments_post_id_fkey" TO "mp_app_comments_post_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_author_id_fkey') THEN
    ALTER TABLE "mp_app_comments"
      RENAME CONSTRAINT "comments_author_id_fkey" TO "mp_app_comments_author_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_id_fkey') THEN
    ALTER TABLE "mp_app_comments"
      RENAME CONSTRAINT "comments_parent_id_fkey" TO "mp_app_comments_parent_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_root_comment_id_fkey') THEN
    ALTER TABLE "mp_app_comments"
      RENAME CONSTRAINT "comments_root_comment_id_fkey" TO "mp_app_comments_root_comment_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reactions_comment_id_fkey') THEN
    ALTER TABLE "mp_app_comment_reactions"
      RENAME CONSTRAINT "comment_reactions_comment_id_fkey" TO "mp_app_comment_reactions_comment_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reactions_user_id_fkey') THEN
    ALTER TABLE "mp_app_comment_reactions"
      RENAME CONSTRAINT "comment_reactions_user_id_fkey" TO "mp_app_comment_reactions_user_id_fkey";
  END IF;
END $$;
