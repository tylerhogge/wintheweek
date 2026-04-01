-- Add CEO briefing fields to insights table
-- These support the enhanced CEO briefing email with complete AI insight data

ALTER TABLE insights ADD COLUMN IF NOT EXISTS bottom_line text;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS cross_functional_themes text;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS risk_items text;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS initiative_tracking text;
