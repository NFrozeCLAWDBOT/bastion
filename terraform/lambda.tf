resource "aws_lambda_function" "resolver" {
  function_name = "${var.project_name}-resolver"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.12"
  timeout       = 60
  memory_size   = 256
  filename      = "${path.module}/../lambda/resolver/resolver.zip"

  source_code_hash = filebase64sha256("${path.module}/../lambda/resolver/resolver.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.dependency_cache.name
    }
  }
}

resource "aws_lambda_function" "sbom" {
  function_name = "${var.project_name}-sbom"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.12"
  timeout       = 30
  memory_size   = 128
  filename      = "${path.module}/../lambda/sbom/sbom.zip"

  source_code_hash = filebase64sha256("${path.module}/../lambda/sbom/sbom.zip")
}

resource "aws_lambda_permission" "resolver_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resolver.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "sbom_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sbom.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
