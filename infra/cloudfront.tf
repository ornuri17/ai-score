# ============================================================
# CloudFront — HTTPS CDN for frontend
# ============================================================

# Rewrites known SPA routes to /index.html at the edge so that unknown paths
# can return a real 404 (see cloudfront-spa-router.js).
resource "aws_cloudfront_function" "spa_router" {
  name    = "${local.name_prefix}-spa-router"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite SPA routes to /index.html, let everything else 404"
  publish = true
  code    = file("${path.module}/cloudfront-spa-router.js")
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US + Europe only (cheapest)
  comment             = "AIScore frontend"

  aliases = var.acm_certificate_arn != "" ? [var.domain_name, "www.${var.domain_name}"] : []

  # S3 origin
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }

    # Link header for AI agent discovery (RFC 8288), checked by agent readiness scanners.
    response_headers_policy_id = aws_cloudfront_response_headers_policy.agent_links.id

    # Assets are immutable — cache 1 year; index.html uses a separate behavior
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # index.html — never cache (React Router needs fresh HTML)
  ordered_cache_behavior {
    path_pattern           = "/index.html"
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Missing objects: S3 with OAC answers 403 for a missing key, 404 with ListBucket.
  # Both become a real HTTP 404 whose body is index.html, so the app renders its
  # Not Found page. Known SPA routes never get here: the spa_router function
  # rewrites them to /index.html first, so they keep answering 200.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/index.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/index.html"
    error_caching_min_ttl = 60
  }

  # Security headers via response headers policy
  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == ""
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-cloudfront" })
}

# CloudFront response headers policy — security headers
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${local.name_prefix}-security-headers"
  comment = "Security headers for AIScore"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}

# Link header (RFC 8288) pointing agents at the API catalog (RFC 9727) and the Markdown
# version of the home page. Both files are generated at build time by
# frontend/scripts/generate-agent-files.mjs. Attached to the default cache behavior.
resource "aws_cloudfront_response_headers_policy" "agent_links" {
  name    = "${local.name_prefix}-agent-links"
  comment = "Link header for AI agent discovery"

  custom_headers_config {
    items {
      header   = "Link"
      value    = "</.well-known/api-catalog>; rel=\"api-catalog\", </index.md>; rel=\"alternate\"; type=\"text/markdown\""
      override = false
    }
  }
}
