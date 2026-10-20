-- Two45 snapshot write / I/O audit. READ ONLY.
-- Execute twice at least 10 minutes apart and compare the two rows for the
-- same queryid. pg_stat_statements counters are cumulative since stats reset.
-- pg_stat_statements shared_blks_dirtied is not physical disk bytes.
SELECT now() AS sampled_at,
       d.stats_reset,
       s.queryid,
       s.calls,
       round(s.total_exec_time::numeric, 1) AS total_exec_ms,
       s.shared_blks_dirtied,
       s.shared_blks_written,
       s.wal_bytes,
       left(regexp_replace(s.query, '[[:space:]]+', ' ', 'g'), 180) AS query_prefix
FROM pg_stat_statements AS s
CROSS JOIN pg_stat_database AS d
WHERE d.datname = current_database()
  AND s.query ILIKE '%two45_feed_snapshots%'
  AND s.query ILIKE '%ON CONFLICT%'
ORDER BY s.shared_blks_dirtied DESC
LIMIT 10;

-- Payload storage and last refresh by snapshot family.
SELECT split_part(snapshot_key, ':', 1) AS snapshot_family,
       count(*) AS keys,
       sum(pg_column_size(payload)) AS payload_bytes,
       max(refreshed_at) AS most_recent_write,
       count(*) FILTER (WHERE expires_at < now()) AS expired_keys
FROM public.two45_feed_snapshots
GROUP BY 1
ORDER BY payload_bytes DESC
LIMIT 25;

-- Guard: Snapshot timestamps are not necessarily provider odds timestamps.
-- Do NOT use refreshed_at to assert Bet365 quote freshness.
