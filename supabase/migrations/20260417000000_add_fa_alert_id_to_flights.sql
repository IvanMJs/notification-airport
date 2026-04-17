-- Add FlightAware alert ID so we can cancel alerts when flights are removed.
ALTER TABLE flights ADD COLUMN IF NOT EXISTS fa_alert_id integer DEFAULT NULL;
