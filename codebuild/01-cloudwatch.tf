resource "aws_cloudwatch_log_group" "main" {
  name = "loadtests"

  retention_in_days = 180

  tags = {
    Name = "loadtests"
  }
}