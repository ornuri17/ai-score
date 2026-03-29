# ============================================================
# CloudWatch — dashboards, alarms, SNS notifications
# ============================================================

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ---- Alarms ----

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.name_prefix}-lambda-error-rate"
  alarm_description   = "Lambda error rate >5% for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 5

  metric_query {
    id          = "error_rate"
    expression  = "errors / invocations * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Errors"
      dimensions  = { FunctionName = aws_lambda_function.api.function_name }
      period      = 300
      stat        = "Sum"
    }
  }

  metric_query {
    id = "invocations"
    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Invocations"
      dimensions  = { FunctionName = aws_lambda_function.api.function_name }
      period      = 300
      stat        = "Sum"
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_p99_latency" {
  alarm_name          = "${local.name_prefix}-lambda-p99-latency"
  alarm_description   = "Lambda p99 latency >5s"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5000
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  dimensions          = { FunctionName = aws_lambda_function.api.function_name }
  period              = 300
  extended_statistic  = "p99"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "apigw_5xx" {
  alarm_name          = "${local.name_prefix}-apigw-5xx"
  alarm_description   = "API Gateway 5xx rate >10%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 10
  namespace           = "AWS/ApiGateway"
  metric_name         = "5XXError"
  dimensions = {
    ApiName  = aws_api_gateway_rest_api.main.name
    Stage    = aws_api_gateway_stage.prod.stage_name
  }
  period        = 300
  statistic     = "Average"
  alarm_actions = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.name_prefix}-rds-connections"
  alarm_description   = "RDS connection count >50"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 50
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.id }
  period              = 300
  statistic           = "Maximum"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "billing" {
  alarm_name          = "${local.name_prefix}-daily-cost"
  alarm_description   = "Estimated daily AWS charges >$15"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 15
  namespace           = "AWS/Billing"
  metric_name         = "EstimatedCharges"
  dimensions          = { Currency = "USD" }
  period              = 86400
  statistic           = "Maximum"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  # Billing alarms must be in us-east-1
  provider = aws
  tags     = local.common_tags
}

# ---- Dashboard ----

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Invocations & Errors"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.api.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.api.function_name],
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Duration (p50 / p99)"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.api.function_name, { stat = "p50", label = "p50" }],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.api.function_name, { stat = "p99", label = "p99" }],
          ]
          period = 300
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway 4xx / 5xx"
          region = var.aws_region
          metrics = [
            ["AWS/ApiGateway", "4XXError", "ApiName", aws_api_gateway_rest_api.main.name, "Stage", "prod"],
            ["AWS/ApiGateway", "5XXError", "ApiName", aws_api_gateway_rest_api.main.name, "Stage", "prod"],
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "RDS Connections"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.id],
          ]
          period = 300
          stat   = "Maximum"
          view   = "timeSeries"
        }
      },
    ]
  })
}
