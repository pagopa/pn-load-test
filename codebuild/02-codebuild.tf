locals {
  codebuild_role_name = "codebuild"
}

## Note
## This  trusted relationship is a bit tricky since it refers itself.
resource "aws_iam_role" "main" {
  name = local.codebuild_role_name

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com",
        "AWS": "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/codebuild"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "main" {
  role = aws_iam_role.main.name

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Resource": [
        "*"
      ],
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "ssm:GetParameters",
        "cloudwatch:PutMetricData",
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ]
    }
  ]
}
POLICY
}


resource "aws_codebuild_project" "main" {
  name          = format("%s-load-tests", local.project)
  description   = "Run k6.io load tests"
  build_timeout = "30"
  service_role  = aws_iam_role.main.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "ENV_NAME"
      value = "dev"
    }

     environment_variable {
      name  = "TEST_TYPE"
      value = "localTest"
    }

    environment_variable {
      name  = "TEST_SCRIPT"
      value = "DeliverySentNotification.js"
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = aws_cloudwatch_log_group.main.name
      stream_name = "tests"
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/pagopa/pn-load-test.git"
    git_clone_depth = 1

    git_submodules_config {
      fetch_submodules = false
    }

    buildspec = "codebuild/buildspec.yml"
  }

  cache {
    type  = "LOCAL"
    modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }

  source_version = "main"

  tags = {
    Environment = "Test"
  }
}