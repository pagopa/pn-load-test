terraform {
  required_version = ">= 1.1.5"

  backend "s3" {
    region = "eu-south-1"
    bucket = "terraform-backend-2972"
    key     = "dev/pn-load-test/terraform.tfstate"
    encrypt = true
    dynamodb_table="terraform-lock"
  }



  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.10.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = var.tags
  }
}

locals {
  project = format("%s-%s", var.app_name, var.env_short)
}

data "aws_caller_identity" "current" {}