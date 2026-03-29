# Lead Export

How to export leads from the production database for the sales team.

## Weekly export (copy-paste into psql)

```sql
SELECT
  l.name,
  l.email,
  l.phone,
  c.domain,
  c.score,
  c.crawlability_score,
  c.content_score,
  c.technical_score,
  c.quality_score,
  l.created_at AT TIME ZONE 'UTC' AS submitted_at
FROM leads l
JOIN checks c ON c.id = l.check_id
WHERE l.created_at >= NOW() - INTERVAL '7 days'
ORDER BY l.created_at DESC;
```

## Export to CSV (from psql)

```bash
psql $DATABASE_URL -c "\COPY (
  SELECT l.name, l.email, l.phone, c.domain, c.score, l.created_at
  FROM leads l JOIN checks c ON c.id = l.check_id
  WHERE l.created_at >= NOW() - INTERVAL '7 days'
  ORDER BY l.created_at DESC
) TO '/tmp/leads_$(date +%Y%m%d).csv' WITH CSV HEADER"
```

## Lead status values (`cto_status` column)

| Value | Meaning |
|-------|---------|
| `new` | Just submitted, not yet contacted |
| `contacted` | Initial outreach sent |
| `qualified` | Confirmed interest |
| `closed` | Deal done |
| `disqualified` | Not a fit |

## Update lead status

```sql
UPDATE leads SET cto_status = 'contacted', updated_at = NOW()
WHERE email = 'user@example.com';
```

## All-time lead count

```sql
SELECT COUNT(*), cto_status FROM leads GROUP BY cto_status ORDER BY count DESC;
```
