-- Migration: Blog SEO + Tipster Monetization
-- BatchA — 20260716120000

-- ─── Blog Posts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "slug"        TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "excerpt"     TEXT,
  "coverImage"  TEXT,
  "category"    TEXT NOT NULL DEFAULT 'general',
  "published"   BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "metaTitle"   TEXT,
  "metaDesc"    TEXT,
  "views"       INTEGER NOT NULL DEFAULT 0,
  "authorId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug"),
  CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx"        ON "blog_posts"("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_published_idx"   ON "blog_posts"("published", "publishedAt");

-- ─── Tipster Plans ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tipster_plans" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tipsterId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL DEFAULT 'Plan Premium',
  "description" TEXT,
  "price"       INTEGER NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tipster_plans_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "tipster_plans_tipsterId_key" UNIQUE ("tipsterId"),
  CONSTRAINT "tipster_plans_tipsterId_fkey" FOREIGN KEY ("tipsterId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─── Tipster Subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tipster_subscriptions" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "subscriberId" TEXT NOT NULL,
  "planId"       TEXT NOT NULL,
  "status"       "SubStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate"      TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tipster_subscriptions_pkey"                    PRIMARY KEY ("id"),
  CONSTRAINT "tipster_subscriptions_subscriberId_planId_key" UNIQUE ("subscriberId", "planId"),
  CONSTRAINT "tipster_subscriptions_subscriberId_fkey" FOREIGN KEY ("subscriberId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tipster_subscriptions_planId_fkey" FOREIGN KEY ("planId")
    REFERENCES "tipster_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "tipster_subscriptions_subscriberId_idx" ON "tipster_subscriptions"("subscriberId");
