-- Add sentiment and themes columns to insights table
-- sentiment_score: 1-10 scale (1 = very negative, 10 = very positive)
-- sentiment_label: human-readable label (e.g. "Positive", "Concerned")
-- themes: array of top themes/topics extracted from replies

ALTER TABLE insights ADD COLUMN IF NOT EXISTS sentiment_score smallint;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS sentiment_label text;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS themes jsonb;
