resource "aws_dynamodb_table" "dependency_cache" {
  name         = "bastion-dependency-cache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "manifestHash"

  attribute {
    name = "manifestHash"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}
