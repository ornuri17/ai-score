output "api_gateway_url" {
  description = "API Gateway invoke URL — set as VITE_API_URL in frontend build"
  value       = "${aws_api_gateway_stage.prod.invoke_url}"
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain — point your DNS CNAME here"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — set as CF_DISTRIBUTION_ID in GitHub secrets"
  value       = aws_cloudfront_distribution.frontend.id
}

output "rds_endpoint" {
  description = "RDS endpoint — used in DATABASE_URL"
  value       = aws_db_instance.main.address
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint — used in REDIS_URL"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "lambda_function_name" {
  description = "Lambda function name — used in CI/CD deploy step"
  value       = aws_lambda_function.api.function_name
}

output "lambda_deployments_bucket" {
  description = "S3 bucket for Lambda zips"
  value       = aws_s3_bucket.lambda_deployments.id
}

output "frontend_bucket" {
  description = "S3 bucket for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "deployer_access_key_id" {
  description = "AWS_ACCESS_KEY_ID for GitHub Actions — set in repo secrets"
  value       = aws_iam_access_key.deployer.id
}

output "deployer_secret_access_key" {
  description = "AWS_SECRET_ACCESS_KEY for GitHub Actions — set in repo secrets"
  value       = aws_iam_access_key.deployer.secret
  sensitive   = true
}
