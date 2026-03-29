variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "db_password" {
  description = "RDS master password — store in terraform.tfvars (gitignored)"
  type        = string
  sensitive   = true
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for email delivery"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Primary domain (e.g. aiscore.io)"
  type        = string
  default     = "aiscore.io"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1 for CloudFront)"
  type        = string
  default     = ""  # Leave empty to skip custom domain — CloudFront URL is used instead
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
}
