# Runbook — AIScore Production

## Quick links

- CloudWatch dashboard: AWS Console → CloudWatch → Dashboards → `aiscore-overview`
- Lambda function: `aiscore-api-prod`
- RDS: `aiscore-postgres`
- ElastiCache: `aiscore-redis`
- API Gateway: `aiscore-api` (prod stage)
- CloudFront: see `terraform output cloudfront_domain`

---

## Incident: API returning 5xx errors

1. Check Lambda error logs:
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/aiscore-api-prod \
     --filter-pattern "ERROR" \
     --start-time $(date -v-1H +%s000)
   ```

2. Check if RDS is reachable (connection count in CloudWatch → RDS → DatabaseConnections)

3. Check if Redis is reachable (ElastiCache → Metrics → CurrConnections)

4. **Rollback**: In Lambda console → Versions → pick last stable version → publish alias `prod` to it

---

## Incident: Lambda cold starts > 3s

1. Check CloudWatch → Lambda → Duration (p99)
2. Enable Provisioned Concurrency (1 instance = ~$15/mo):
   ```bash
   aws lambda put-provisioned-concurrency-config \
     --function-name aiscore-api-prod \
     --qualifier prod \
     --provisioned-concurrent-executions 1
   ```

---

## Incident: RDS connection exhaustion

Lambda spawns many concurrent connections. If `DatabaseConnections > 50`:

1. Check for Lambda concurrency spike in CloudWatch
2. Verify connection pooling in `src/db/` (max pool = 5)
3. Temporarily reduce Lambda concurrency:
   ```bash
   aws lambda put-function-concurrency \
     --function-name aiscore-api-prod \
     --reserved-concurrent-executions 20
   ```

---

## Incident: Rate-limit false positives

If legitimate users are hitting 429:

1. Check Redis key: `redis-cli -h <redis-endpoint> GET ratelimit:ip:<hash>`
2. Manually clear a specific IP's limit:
   ```bash
   redis-cli -h <redis-endpoint> DEL ratelimit:ip:<hash>
   ```
3. Adjust `RATE_LIMIT_CHECKS_IP` env var in Lambda if needed

---

## Deploy: manual hotfix

```bash
npm run build:lambda
aws s3 cp lambda.zip s3://aiscore-lambda-deployments/lambda.zip
aws lambda update-function-code \
  --function-name aiscore-api-prod \
  --s3-bucket aiscore-lambda-deployments \
  --s3-key lambda.zip
```

---

## Deploy: frontend hotfix

```bash
cd frontend
VITE_API_URL=<api-gateway-url> npm run build
aws s3 sync dist/ s3://aiscore-frontend-prod --delete
aws cloudfront create-invalidation \
  --distribution-id <CF_ID> \
  --paths "/*"
```

---

## Check lead pipeline

```bash
# Count leads in last 24h
psql $DATABASE_URL -c \
  "SELECT COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '24 hours';"

# Check for failed email deliveries → SendGrid dashboard
# https://app.sendgrid.com/email_activity
```

---

## Billing alert triggered

1. Check AWS Cost Explorer for spike source
2. Check NAT Gateway bytes (common cause)
3. Check Lambda invocation count for unusual traffic
4. If scrapers/abuse: tighten rate limits in Lambda env vars
