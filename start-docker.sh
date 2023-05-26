#! /bin/bash

# http_debug o semplice o full

# altro parametro il nome dello script

#if ( [ ! -z $e2eTestApiKey ] ) then
#  export API_KEY=${e2eTestApiKey}
#fi

mkdir -p $(pwd)/outputs

docker run --rm -ti --env-file $1 \
  -v $(pwd)/outputs/:/outputs/ \
  k6 run \
  --log-format json \
  src/DeliverySendNotification.js \
  --out json=/outputs/result-timing.json \
  --http-debug \
  --console-output=/outputs/console-output.txt \
  --log-output=file=/outputs/http-output.json
