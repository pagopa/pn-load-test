terraform {
  required_version = "~> 1.4.0"

#  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  profile = "dev"
}

# terraform state file setup
# create an S3 bucket to store the state file in

resource "random_integer" "bucket_suffix" {
  min = 1
  max = 9999
}
resource "aws_s3_bucket" "terraform_states" {
  bucket = format("terraform-backend-%04s", random_integer.bucket_suffix.result)

  lifecycle {
    # prevent_destroy = true
  }

  tags = merge(var.tags, {
    name = "S3 Remote Terraform State Store"
  })
}

resource "aws_s3_bucket_acl" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_states" {
  bucket                  = aws_s3_bucket.terraform_states.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# create a DynamoDB table for locking the state file
resource "aws_dynamodb_table" "dynamodb-terraform-state-lock" {
  name           = "terraform-lock"
  hash_key       = "LockID"
  read_capacity  = 8
  write_capacity = 8

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(var.tags, {
    name = "DynamoDB Terraform State Lock Table"
  })

}

## IAM user who can manage the infrastructure definition
data "aws_iam_policy" "admin_access" {
  name = "AdministratorAccess"
}

resource "aws_iam_group" "admins" {
  name = "Admins"
}

resource "aws_iam_group_policy_attachment" "admins" {
  group      = aws_iam_group.admins.name
  policy_arn = data.aws_iam_policy.admin_access.arn
}

resource "aws_iam_user" "iac" {
  name = "iac"

  tags = var.tags
}


data "aws_caller_identity" "current" {}
