#!/usr/bin/env bash

# extract notification request ids from console-output.txt
#
# usage: ./get_test_metrics/extract-notification-request-ids.sh outputs/console-output.txt outputs/notification-request-ids.txt
#
# ./get_test_metrics/extract-notification-request-ids.sh outputs/test/console-output.txt outputs/test/notification-request-ids.txt
#
# ./get_test_metrics/extract-notification-request-ids.sh outputs/2023-06-12_23-21__W6_30iter_30min_test_1206-2321/console-output.txt outputs/2023-06-12_23-21__W6_30iter_30min_test_1206-2321/notification-request-ids.txt

# ensure we passed <source> <destination>
if [ $# -ne 2 ]; then
  echo "Usage: $0 <source> <destination>"
  exit 1
fi

source=$1
destination=$2

grep notificationRequestId ${source} | jq -r '.msg' | grep REQUEST-ID-LOG | sed -E 's/.*notificationRequestId\":\"//g' | sed -E 's/\",\"paProtocolNumber.*//g' > ${destination}
