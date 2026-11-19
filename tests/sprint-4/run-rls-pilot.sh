#!/bin/sh
set -eu
export PGHOST=/scratch PGPORT=5432 PGUSER=postgres
initdb -D /scratch/pg --auth=trust --encoding=UTF8 --no-locale >/scratch/init.log
pg_ctl -D /scratch/pg -l /scratch/postgres.log -o '-c listen_addresses= -c unix_socket_directories=/scratch -c max_connections=10 -c statement_timeout=10000' -w start >/dev/null
trap 'pg_ctl -D /scratch/pg -m fast stop >/dev/null' EXIT
createdb sprint4_pilot
psql -Xq -v ON_ERROR_STOP=1 -d sprint4_pilot -f /pilot/rls-pilot.sql
psql -Xq -v ON_ERROR_STOP=1 -d sprint4_pilot -f /pilot/rls-checks.sql
echo 'RLS: student, instructor, administrator, absent context, transaction reset and restricted grants passed'
pg_dump -Fc -d sprint4_pilot -f /scratch/pilot.dump
start=$(date +%s%N)
createdb sprint4_recovery
pg_restore --exit-on-error -d sprint4_recovery /scratch/pilot.dump
stop=$(date +%s%N)
fingerprint='SELECT md5(string_agg(row_to_json(c)::text, '\'','\'' ORDER BY id)),count(*) FROM pilot.course c'
before=$(psql -XAt -d sprint4_pilot -c "$fingerprint")
after=$(psql -XAt -d sprint4_recovery -c "$fingerprint")
test "$before" = "$after"
psql -Xq -v ON_ERROR_STOP=1 -d sprint4_recovery -f /pilot/rls-checks.sql
printf 'Recovery: synthetic courses and policies restored, fingerprint_count=%s, %s ms\n' "$after" "$(((stop-start)/1000000))"
psql -Xq -v ON_ERROR_STOP=1 -d sprint4_pilot -c 'CREATE TABLE pilot.rate_bucket (key int PRIMARY KEY, count int NOT NULL, expires_at timestamptz NOT NULL)'
pgbench -n -c 4 -j 1 -t 25 -f /pilot/limiter-benchmark.sql sprint4_pilot
test "$(psql -XAt -d sprint4_pilot -c 'SELECT count(*) || chr(124) || max(count) FROM pilot.rate_bucket')" = '2|6'
echo 'Limiter: 100 fixture transactions across two keys with saturation at budget + 1'
psql -Xq -v ON_ERROR_STOP=1 -d sprint4_pilot -c 'UPDATE pilot.rate_bucket SET expires_at = statement_timestamp() - interval '\''1 second'\'' WHERE key = 1'
pgbench -n -c 1 -j 1 -t 1 -f /pilot/limiter-benchmark.sql sprint4_pilot >/dev/null
test "$(psql -XAt -d sprint4_pilot -c 'SELECT count = 1 AND expires_at > statement_timestamp() FROM pilot.rate_bucket WHERE key = 1')" = 't'
echo 'Limiter: expired counter resets with a fresh window'
