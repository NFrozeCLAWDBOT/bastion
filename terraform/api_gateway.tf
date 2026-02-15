resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://${var.domain_name}"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

# Resolver integration
resource "aws_apigatewayv2_integration" "resolver" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.resolver.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "analyse" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /api/analyse"
  target    = "integrations/${aws_apigatewayv2_integration.resolver.id}"
}

# SBOM integration
resource "aws_apigatewayv2_integration" "sbom" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.sbom.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "sbom" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /api/sbom"
  target    = "integrations/${aws_apigatewayv2_integration.sbom.id}"
}
