variable "aws_region" {
  type        = string
  description = "AWS region to create resources. Default Milan"
  default     = "eu-south-1"
}

variable "app_name" {
  type        = string
  default     = "pn"
  description = "App name. Piattaforma notifiche"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment"
}

variable "env_short" {
  type        = string
  default     = "dev"
  description = "Evnironment short."
}

variable "azs" {
  type        = list(string)
  description = "Availability zones"
  default     = ["eu-south-1a", "eu-south-1b", "eu-south-1c"]
}

variable "tags" {
  type = map(any)
  default = {
    CreatedBy = "Terraform"
  }
}
