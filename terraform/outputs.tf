output "api_url" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

output "s3_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "s3_website_endpoint" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}
