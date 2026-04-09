# ============================================================
# IAM — Lambda execution role
# ============================================================

resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# IAM — CI/CD deploy role (used by GitHub Actions)
resource "aws_iam_user" "deployer" {
  name = "${local.name_prefix}-deployer"
  tags = local.common_tags
}

resource "aws_iam_user_policy" "deployer" {
  name = "${local.name_prefix}-deploy-policy"
  user = aws_iam_user.deployer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
          "lambda:InvokeFunction",
          "lambda:PublishVersion",
        ]
        Resource = aws_lambda_function.api.arn
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.lambda_deployments.arn,
          "${aws_s3_bucket.lambda_deployments.arn}/*",
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.frontend.arn
      },
    ]
  })
}

resource "aws_iam_access_key" "deployer" {
  user = aws_iam_user.deployer.name
}

# ============================================================
# SSM Parameter Store — secrets (referenced by Lambda)
# ============================================================

resource "aws_ssm_parameter" "db_url" {
  name  = "/${local.name_prefix}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://aiscore:${var.db_password}@${aws_db_instance.main.address}:5432/aiscore_prod"
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "/${local.name_prefix}/REDIS_URL"
  type  = "SecureString"
  value = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "sendgrid_api_key" {
  name  = "/${local.name_prefix}/SENDGRID_API_KEY"
  type  = "SecureString"
  value = var.sendgrid_api_key
  tags  = local.common_tags
}

# ============================================================
# Lambda function
# ============================================================

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name_prefix}-api-prod"
  retention_in_days = 30
  tags              = local.common_tags
}

# Placeholder zip — CI/CD replaces this on first deploy
resource "aws_s3_object" "lambda_placeholder" {
  bucket  = aws_s3_bucket.lambda_deployments.id
  key     = "lambda.zip"
  content = "placeholder"

  lifecycle {
    # Never overwrite once CI/CD has deployed the real zip
    ignore_changes = [content, etag]
  }
}

resource "aws_lambda_function" "api" {
  function_name = "${local.name_prefix}-api-prod"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs22.x"
  handler       = "dist/index.handler"
  timeout       = 30
  memory_size   = 512

  s3_bucket = aws_s3_bucket.lambda_deployments.id
  s3_key    = "lambda.zip"

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV         = "production"
      DATABASE_URL     = aws_ssm_parameter.db_url.value
      REDIS_URL        = aws_ssm_parameter.redis_url.value
      SENDGRID_API_KEY = var.sendgrid_api_key
      PORT             = "3000"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda,
    aws_s3_object.lambda_placeholder,
  ]

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-api-prod" })

  lifecycle {
    # CI/CD manages the actual code — Terraform only manages config
    ignore_changes = [s3_key, s3_object_version]
  }
}
