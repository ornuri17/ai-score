terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after creating the S3 bucket manually (one-time bootstrap):
  # backend "s3" {
  #   bucket = "aiscore-terraform-state"
  #   key    = "prod/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = "aiscore"
  common_tags = {
    Project     = "AIScore"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
