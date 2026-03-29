# AIScore — Terraform Infrastructure

Provisions the full AWS stack: VPC, RDS, ElastiCache, Lambda, API Gateway, CloudFront, S3, IAM, CloudWatch.

## Prerequisites

- Terraform >= 1.6 (`brew install terraform`)
- AWS CLI configured (`aws configure`) with admin credentials
- AWS account in `us-east-1`

## First-time setup

```bash
cd infra

# 1. Copy and fill in secrets
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set db_password, sendgrid_api_key, alert_email

# 2. Init Terraform
terraform init

# 3. Preview changes
terraform plan

# 4. Apply (takes ~10 min — RDS + ElastiCache are slow)
terraform apply
```

## After apply — set GitHub secrets

Run this to print the values to add to GitHub → Settings → Secrets:

```bash
terraform output api_gateway_url          # → VITE_API_URL
terraform output cloudfront_distribution_id  # → CF_DISTRIBUTION_ID
terraform output deployer_access_key_id   # → AWS_ACCESS_KEY_ID
terraform output -raw deployer_secret_access_key  # → AWS_SECRET_ACCESS_KEY
```

Also set `DATABASE_URL` in GitHub secrets using the RDS endpoint:
```
postgresql://aiscore:<db_password>@<rds_endpoint>:5432/aiscore_prod
```

## After apply — run DB migrations

```bash
DATABASE_URL="postgresql://aiscore:<password>@<rds_endpoint>:5432/aiscore_prod" \
  npx prisma migrate deploy
```

## Custom domain (optional)

1. Create ACM certificate for `aiscore.io` in `us-east-1`
2. Add the ARN to `terraform.tfvars`:
   ```
   acm_certificate_arn = "arn:aws:acm:us-east-1:..."
   ```
3. `terraform apply`
4. Point `aiscore.io` CNAME → the CloudFront domain from `terraform output cloudfront_domain`

## What's provisioned

| Resource | Details |
|----------|---------|
| VPC | 2 public + 2 private subnets, NAT Gateway |
| RDS | PostgreSQL 15, db.t3.micro, 7-day backups |
| ElastiCache | Redis 7, cache.t3.micro |
| Lambda | Node 22, 512 MB, 30s timeout, VPC-attached |
| API Gateway | REST API, `/{proxy+}` → Lambda |
| S3 | `aiscore-frontend-prod`, `aiscore-lambda-deployments` |
| CloudFront | HTTPS, SPA routing, security headers |
| IAM | Lambda role, deployer user (CI/CD) |
| CloudWatch | Dashboard + 5 alarms (errors, latency, 5xx, RDS, billing) |
| SNS | Email alerts |

## Tear down

```bash
terraform destroy
```

> RDS has `deletion_protection = true` — disable it in the console first, or set it to `false` in `rds.tf` before destroying.
