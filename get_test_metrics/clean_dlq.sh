#!/usr/bin/env bash
    
set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR EXIT

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
  # script cleanup here
}

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)


usage() {
      cat <<EOF
    Usage: $(basename "${BASH_SOURCE[0]}") [-h] [-v] [-p <aws-profile>] -r <aws-region>  [-P <period>] -c <aws-profile-confinfo> -f <k6-run-file>
    [-h]                        : this help message
    [-v]                        : verbose mode
    [-p <aws-profile>]          : aws cli profile (optional)
    -r <aws-region>             : aws region as eu-south-1
    [-P <period>]               : aws cloudwatch get metrics period of sampling (optional - default=60)
    -c <aws-profile-confinfo>   : aws cli profile for confinfo account
    -f <k6-run-file>            : local path of k6 run file with all parameters
EOF
  exit 1
}

parse_params() {
  # default values of variables set from params
  project_name=pn
  work_dir=$HOME/tmp/deploy
  aws_profile=""
  aws_region=""
  period=""
  aws_confinfo=""
  k6_run_file=""

  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -v | --verbose) set -x ;;
    -p | --profile) 
      aws_profile="${2-}"
      shift
      ;;
    -r | --region) 
      aws_region="${2-}"
      shift
      ;;
    -w | --work-dir) 
      work_dir="${2-}"
      shift
      ;;
    -P | --period) 
      period="${2-}"
      shift
      ;;
    -c | --profile-confinfo) 
      aws_confinfo="${2-}"
      shift
      ;;
    -f | --file) 
      k6_run_file="${2-}"
      shift
      ;;
    -?*) die "Unknown option: $1" ;;
    *) break ;;
    esac
    shift
  done

  args=("$@")

  # check required params and arguments
  [[ -z "${aws_region-}" ]] && usage
  return 0
}

dump_params(){
  echo ""
  echo "######      PARAMETERS      ######"
  echo "##################################"
  echo "Project Name:               ${project_name}"
  echo "Work directory:             ${work_dir}"
  echo "AWS region:                 ${aws_region}"
  echo "AWS profile:                ${aws_profile}"
  echo "AWS cloudwatch period       ${period}"
  echo "AWS confidential profile:   ${aws_confinfo}"
  echo "K6 local run file:          ${k6_run_file}"
  }

# START SCRIPT

parse_params "$@"
dump_params


echo ""
echo "=== Base AWS command parameters"
aws_command_base_args=""
if ( [ ! -z "${aws_profile}" ] ) then
  aws_command_base_args="${aws_command_base_args} --profile $aws_profile"
fi
if ( [ ! -z "${aws_region}" ] ) then
  aws_command_base_args="${aws_command_base_args} --region  $aws_region"
fi
echo ${aws_command_base_args}
echo ""
echo "=== Base AWS command parameters for confinfo"
aws_command_base_args_confinfo=""
if ( [ ! -z "${aws_confinfo}" ] ) then
  aws_command_base_args_confinfo="${aws_command_base_args_confinfo} --profile $aws_confinfo"
fi
if ( [ ! -z "${aws_region}" ] ) then
  aws_command_base_args_confinfo="${aws_command_base_args_confinfo} --region  $aws_region"
fi
echo ${aws_command_base_args_confinfo}
echo ""

echo "purge DLQ queue for core account"
for i in $(aws ${aws_command_base_args} sqs list-queues  --output text | grep DLQ | awk '{print $2}'); do
aws ${aws_command_base_args} sqs purge-queue  --queue-url $i  ; echo "queue DLQ $i purged";
done 
echo "purge DLQ for core account completed"

echo "purge DLQ queue for confinfo account"
for i in $(aws ${aws_command_base_args_confinfo} sqs list-queues  --output text | grep DLQ | awk '{print $2}'); do
aws ${aws_command_base_args_confinfo} sqs purge-queue --queue-url $i ; echo "queue DLQ $i purged";
done
echo "purge DLQ for confinfo account completed"

