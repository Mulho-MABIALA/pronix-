-- AlterTable: add emailVerified, referralCode, referredById to users
ALTER TABLE "users"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "referralCode"  TEXT,
  ADD COLUMN "referredById"  TEXT;

-- CreateIndex for referralCode unique
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateTable: email_verifications
CREATE TABLE "email_verifications" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");

-- AddForeignKey
ALTER TABLE "email_verifications"
  ADD CONSTRAINT "email_verifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: referrals
CREATE TABLE "referrals" (
    "id"         TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId"  TEXT NOT NULL,
    "status"     TEXT NOT NULL DEFAULT 'PENDING',
    "rewardedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_refereeId_key" ON "referrals"("refereeId");

-- AddForeignKey
ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_refereeId_fkey"
  FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: bet_entries
CREATE TABLE "bet_entries" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "matchId"    TEXT,
    "teamA"      TEXT NOT NULL,
    "teamB"      TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "odds"       DOUBLE PRECISION NOT NULL,
    "stake"      INTEGER NOT NULL,
    "result"     TEXT,
    "matchDate"  TIMESTAMP(3) NOT NULL,
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bet_entries_userId_idx" ON "bet_entries"("userId");

-- AddForeignKey
ALTER TABLE "bet_entries"
  ADD CONSTRAINT "bet_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bet_entries"
  ADD CONSTRAINT "bet_entries_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: match_reminders
CREATE TABLE "match_reminders" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "matchId"       TEXT NOT NULL,
    "minutesBefore" INTEGER NOT NULL DEFAULT 60,
    "sent"          BOOLEAN NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_reminders_userId_matchId_key" ON "match_reminders"("userId", "matchId");

-- CreateIndex
CREATE INDEX "match_reminders_sent_matchId_idx" ON "match_reminders"("sent", "matchId");

-- AddForeignKey
ALTER TABLE "match_reminders"
  ADD CONSTRAINT "match_reminders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_reminders"
  ADD CONSTRAINT "match_reminders_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
