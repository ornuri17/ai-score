# Cost Analysis

Target: **< $0.01 per website check**

## Projected monthly costs at 1,000 checks/day (~30,000/month)

| Service | Cost | Notes |
|---------|------|-------|
| Lambda | ~$2 | ~1.5s avg duration × 512MB × 30k = negligible |
| API Gateway | ~$10 | $3.50/million requests |
| RDS db.t3.micro | ~$15 | Always-on instance |
| ElastiCache cache.t3.micro | ~$15 | Always-on instance |
| CloudFront | ~$5 | First 10TB/mo free tier, then $0.0085/GB |
| NAT Gateway | ~$35 | $0.045/hr + $0.045/GB data processed ← **biggest cost** |
| SendGrid | ~$0 | Free tier: 100 emails/day |
| **Total** | **~$82/mo** | |

**Cost per check at 1k/day: $82 / 30,000 = $0.0027** ✅ Under target

## At 10,000 checks/day (~300,000/month)

| Service | Cost |
|---------|------|
| Lambda | ~$20 |
| API Gateway | ~$100 |
| RDS (scale to db.t3.small) | ~$30 |
| ElastiCache | ~$15 |
| CloudFront | ~$15 |
| NAT Gateway | ~$45 |
| **Total** | **~$225/mo** |

**Cost per check at 10k/day: $225 / 300,000 = $0.00075** ✅

## Cost levers

### NAT Gateway (biggest cost)
NAT Gateway charges $0.045/GB processed. If crawling pulls large pages, this adds up.
- Monitor via CloudWatch: `NatGatewayBytesOutToDestination`
- Consider a VPC endpoint for S3 (free) to avoid NAT for S3 traffic

### Cache hit rate
Every cache hit = no Lambda invocation, no crawl, no NAT egress.
- Target >40% cache hit rate
- Check: `SELECT COUNT(*) FILTER (WHERE cached = true) / COUNT(*) FROM checks WHERE created_at > NOW() - INTERVAL '7 days'`

### Lambda memory
512MB chosen for p99 <3s. If comfortable at p99 <5s, drop to 256MB and cut Lambda cost in half.

## How to pull actual costs

```bash
# Requires AWS CLI + Cost Explorer enabled
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-7d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```
