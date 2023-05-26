#! /bin/sh -e

echo "=== k6 pre-launch Script Started. USE_AWS_AGENT=$USE_AWS_AGENT "

if ( [ "$USE_AWS_AGENT" = "true" ] ) then
  echo "Start AWS profile configuration"

  mkdir -p /root/.aws

  cat << EOF > /root/.aws/credentials
[AmazonCloudWatchAgent]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY
aws_session_token = $AWS_SESSION_TOKEN
aws_session_token = $AWS_SESSION_TOKEN
region = $AWS_REGION
EOF

  echo "Start cloudwatch agent."
  /opt/aws/amazon-cloudwatch-agent/bin/start-amazon-cloudwatch-agent&
  sleep 10
  export K6_STATSD_ENABLE_TAGS=true
fi

echo ""
echo ""
echo "===                            LAUNCH K6                            ==="
echo "======================================================================="
echo k6 $*
k6 $*

aws_cloudwatch_agent_log_file="/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
if ( [ -e $aws_cloudwatch_agent_log_file ] ) then
  echo "============ CloudWatch agent logs"
  echo "=============================================================="
  sleep 60
  cat $aws_cloudwatch_agent_log_file
fi

