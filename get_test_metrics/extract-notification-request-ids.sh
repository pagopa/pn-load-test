#!/usr/bin/env bash

# extract notification request ids from console-output.txt
#
# usage: ./get_test_metrics/extract-notification-request-ids.sh outputs/console-output.txt outputs/notification-request-ids.txt
#
# ./get_test_metrics/extract-notification-request-ids.sh outputs/test/console-output.txt outputs/test/notification-request-ids.txt
#
# ./get_test_metrics/extract-notification-request-ids.sh outputs/2023-06-07_12-02__W6_05iter_30min_0706-1202/console-output.txt outputs/2023-06-07_12-02__W6_05iter_30min_0706-1202/notification-request-ids.txt

# ensure we passed <source> <destination>
if [ $# -ne 2 ]; then
  echo "Usage: $0 <source> <destination>"
  exit 1
fi

source=$1
destination=$2

grep notificationRequestId ${source} | jq -r '.msg' | grep REQUEST-ID-LOG | sed -E 's/.*notificationRequestId\":\"//g' | sed -E 's/\",\"paProtocolNumber.*//g' > ${destination}
