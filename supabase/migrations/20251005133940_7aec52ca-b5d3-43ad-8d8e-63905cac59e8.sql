-- Add 'cancelled' to the redemption_status enum
ALTER TYPE redemption_status ADD VALUE IF NOT EXISTS 'cancelled';