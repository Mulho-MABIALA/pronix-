-- Migration: snapshot des réglages du générateur sur un ticket sauvegardé
-- (raccourci "Refaire comme hier") — 20260803090000
ALTER TABLE "tip_combos" ADD COLUMN IF NOT EXISTS "settings" JSONB;
