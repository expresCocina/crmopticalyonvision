-- Migration: Add bot_active and unread_count to leads table
-- Date: 2026-02-02

-- Add bot_active column (controls if bot responds automatically)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_active boolean DEFAULT true;

-- Add unread_count column (tracks unread messages)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0;

-- Create RPC function to increment unread count atomically
CREATE OR REPLACE FUNCTION increment_unread_count(row_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE leads SET unread_count = unread_count + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_unread_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_unread_count(uuid) TO service_role;

-- Update existing leads to have bot_active = true
UPDATE leads SET bot_active = true WHERE bot_active IS NULL;
UPDATE leads SET unread_count = 0 WHERE unread_count IS NULL;
