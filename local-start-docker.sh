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
  # Variabili opzionali:
  #  K6_SCRIPT     script da eseguire (default src/DeliverySendAndReceiverGetDownload.js)
  #  LIGHT_OUTPUT  se "true" disabilita --http-debug e --out json (per run lunghe ad alto rate:
  #                a 2000 req/s per 1h producono ~37GB)
  #  MIN_FREE_GB   spazio libero minimo richiesto per partire (default 40)
  k6_script=${K6_SCRIPT:-src/DeliverySendAndReceiverGetDownload.js}
  min_free_gb=${MIN_FREE_GB:-40}

  free_gb=$(df -BG --output=avail "$(pwd)" | tail -1 | tr -dc '0-9')
  if [ "$free_gb" -lt "$min_free_gb" ]; then
    echo "Spazio libero insufficiente: ${free_gb}GB < ${min_free_gb}GB. Archivia/pulisci outputs/ prima di lanciare."
    exit 1
  fi

  # REUSE_RUN_DIR=true: la cartella l'ha gia' creata run-test.sh (con k6-options.json)
  if [ "$REUSE_RUN_DIR" != "true" ] && [ -e "$(pwd)/outputs/$output_subfolder" ]; then
    echo "La cartella outputs/$output_subfolder esiste gia': usa un nome run univoco."
    exit 1
  fi
  mkdir -p $(pwd)/outputs/$output_subfolder

  verbose_opts="--out json=/outputs/result-timing.json --http-debug"
  if [ "$LIGHT_OUTPUT" == "true" ]; then
    verbose_opts=""
  fi

  echo "======= Rebuild Image"
  docker build --rm -t k6 .
  docker image prune -f

  echo "======= Run K6 ($k6_script)"
  # -ti solo se c'e' un terminale (permette l'avvio in background con nohup)
  tty_opts=""
  if [ -t 0 ]; then tty_opts="-ti"; fi
  # CONTAINER_NAME opzionale: usato da run-test.sh per status/stop
  name_opts=""
  if [ -n "$CONTAINER_NAME" ]; then name_opts="--name $CONTAINER_NAME"; fi
  # K6_OPTIONS_FILE opzionale: options k6 generate, montate come profilo "_run" (TEST_TYPE=_run)
  if [ -n "$K6_OPTIONS_FILE" ]; then
    name_opts="$name_opts -v $K6_OPTIONS_FILE:/tests/src/modules/test-types/_run.json:ro"
  fi
  docker run --rm $tty_opts $name_opts --env-file $credentials_files \
    -v $(pwd)/outputs/$output_subfolder:/outputs/ \
    k6 run \
    --log-format json \
    $k6_script \
    $verbose_opts \
    --summary-export=/outputs/summary.json \
    --console-output=/outputs/console-output.txt \
    --log-output=file=/outputs/http-output.json

elif ( [ "$execution_or_download" == "download" ] ) then
  echo "======= Rebuild Image"
  docker build --rm -t k6 .
  
  echo "======= Download statistics"
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



