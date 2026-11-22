\set slot (:client_id % 2) + 1
INSERT INTO pilot.rate_bucket (key, count, expires_at)
VALUES (:slot, 1, statement_timestamp() + interval '1 minute')
ON CONFLICT (key) DO UPDATE SET count = CASE
  WHEN pilot.rate_bucket.expires_at <= statement_timestamp() THEN 1
  ELSE LEAST(pilot.rate_bucket.count::bigint + 1, 6)::int END,
  expires_at = CASE WHEN pilot.rate_bucket.expires_at <= statement_timestamp()
    THEN EXCLUDED.expires_at ELSE pilot.rate_bucket.expires_at END;
