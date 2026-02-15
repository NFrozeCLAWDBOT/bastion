resource "cloudflare_record" "bastion" {
  zone_id = var.cloudflare_zone_id
  name    = "bastion"
  content = aws_s3_bucket_website_configuration.frontend.website_endpoint
  type    = "CNAME"
  proxied = true
}
