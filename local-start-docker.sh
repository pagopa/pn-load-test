#! /bin/bash

# TODO: parametrizzare con 
#  1) Nome dello script da eseguire (di default src/DeliverySendNotification.js ).
#     N.B: il prefisso src/ sarà sottointeso
#  2) Nome del sottofolder in cui scrivere gli output. Ad esempio /outputs/${valore_di_questo_parametro}
#  3) Avere una modalità che non lancia i test ma scarica le metriche cloudwatch nel lasso di tempo di 
#     esecuzione della run indicata dal secondo parametro.

if ( [ "$#" -ne "3" ]) then
  echo "Usage $0 <env_file> <output_subfolder> <command>"
  echo " where command could be: run download, clean_dlq"
  exit 1
fi

export LOCAL_HOME=$HOME

credentials_files=$1
output_subfolder=$2
execution_or_download=$3

if ( [ "$execution_or_download" == "run" ] ) then
  mkdir -p $(pwd)/outputs/$output_subfolder

  docker run --rm -ti --env-file $credentials_files \
    -v $(pwd)/outputs/$output_subfolder:/outputs/ \
    k6 run \
    --log-format json \
    src/DeliverySendAndReceiverGetDownload.js \
    --out json=/outputs/result-timing.json \
    --http-debug \
    --console-output=/outputs/console-output.txt \
    --log-output=file=/outputs/http-output.json
elif ( [ "$execution_or_download" == "download" ] ) then
  docker run --rm -ti \
    -v $(pwd)/outputs/$output_subfolder:/outputs/ \
    -v "${LOCAL_HOME}/.aws":/root/.aws \
    --entrypoint /tests/get_test_metrics/get_test_metrics_by_folder.sh \
    k6 \
    -f /outputs/ \
    -r eu-south-1 \
    -p sso_pn-core-dev \
    -c sso_pn-confinfo-dev
elif ( [ "$execution_or_download" == "clean_dlq" ] ) then
  docker run --rm -ti \
    -v $(pwd)/outputs/$output_subfolder:/outputs/ \
    -v "${LOCAL_HOME}/.aws":/root/.aws \
    --entrypoint /tests/get_test_metrics/clean_dlq.sh \
    k6 \
    -f /outputs/ \
    -r eu-south-1 \
    -p sso_pn-core-dev \
    -c sso_pn-confinfo-dev
fi



