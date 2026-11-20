#!/bin/bash
# Launcher unico per i test di carico sull'EC2: genera le options k6 dagli argomenti,
# avvia in background, mostra stato/log, archivia su S3 e libera il disco.
#
#   ./run-test.sh start [opzioni carico] [-- KEY=VAL ...]   avvia in background (output leggero)
#   ./run-test.sh plan  [opzioni carico]                    stampa solo le options k6 generate
#   ./run-test.sh list                                      run in outputs/ (dimensione, stato, spazio)
#   ./run-test.sh status [run] | logs [run] | stop [run]
#   ./run-test.sh archive <run>                             tar.gz + sha256 -> S3, verifica, chiede se cancellare
#
# Opzioni di carico (le options k6 vengono generate e salvate in outputs/<run>/k6-options.json):
#   --rate N --duration D        constant-arrival-rate (D: 45m, 1h, 3h3m20s, ...)
#   --ramp "T1:D1,T2:D2,..."     ramping-arrival-rate: ogni stage porta il rate a T in D (target uguale
#                                al precedente = mantenimento); --start-rate N (default 0)
#                                es. --ramp "10:5m,92:5m,92:20m,150:5m,150:20m,200:5m,200:13m"
#   --vus N --iterations N --max-duration D   shared-iterations (throughput = VU / latenza)
#   --then-rate N --then-duration D           seconda fase a rate costante (es. 60/s per 1h);
#                                             ITERATION_OFFSET = eventi della prima fase
#   --max-vus N                  (rate) default rate*3; preAllocatedVUs = rate/2
#   --max-dropped N              soglia dropped_iterations (default 1% degli eventi previsti)
#   --p99 MS                     soglia p99 producePayment (default 1500)
#   --max-fail R                 soglia http_req_failed (default 0.01)
#   --test-type NOME             usa invece un JSON esistente in src/modules/test-types (es. paymentEventsSmoke)
#   --name NOME                  nome run (default payment_<rate>rps_<durata>_<ddmmyyyy_HHMM>)
#   --full-output                riattiva --http-debug e --out json (solo run brevi: 2000 req/s x 1h ~ 37GB)
#   --with-notifications         aggiunge in parallelo il flusso standard di invio notifiche (w7w6F24Test.js,
#                                invariato): W7 analogico fino a 40/s, F24 e W6 digitale fino a 10/s, rampa 15m
#                                poi mantenimento; script src/PaymentEventsWithNotificationsTest.js.
#                                L'env file deve contenere anche BASE_PATH, API_KEY, PA_TAX_ID (WITH_PAYMENT opz.)
#   --notif-hold D               (notifiche) durata del mantenimento dopo la rampa (default 45m, come il file)
#   --notif-start D              (notifiche) ritardo di avvio rispetto agli eventi (default: con --then-rate
#                                all'inizio della seconda fase, es. i 60/s dopo il pregresso; altrimenti 0s)
# Dopo "--": KEY=VAL passate a k6 come env (es. SEND_EVENT_RATIO=0.06), sovrascrivono l'env file.
# SEND_EVENT_RATIO e' obbligatorio (env file o "--"); un valore > 0.06 chiede conferma (1 = tutti su notifiche reali).
#
# Variabili: ENV_FILE (default credentials/payment-test.env), K6_SCRIPT (default src/PaymentEventsTest.js,
#            src/PaymentEventsWithNotificationsTest.js con --with-notifications),
#            S3_ARCHIVE (default s3://pn-temporary-load-test-core-test/runs)
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=${ENV_FILE:-credentials/payment-test.env}
K6_SCRIPT_USER=${K6_SCRIPT:-}
S3_ARCHIVE=${S3_ARCHIVE:-s3://pn-temporary-load-test-core-test/runs}
OUT=outputs

die() { echo "ERRORE: $*" >&2; exit 1; }
last_run() { ls -1t "$OUT" 2>/dev/null | head -1; }
container_of() { echo "k6_$1"; }
is_running() { [ -n "$(docker ps -q -f name="^$(container_of "$1")$")" ]; }
to_sec() { # 1h30m20s -> 5420
  local d=$1 s=0 n
  [[ $d =~ ^([0-9]+h)?([0-9]+m)?([0-9]+s)?$ && -n $d ]] || die "durata non valida: $d"
  [[ $d =~ ([0-9]+)h ]] && s=$((s + BASH_REMATCH[1] * 3600))
  [[ $d =~ ([0-9]+)m ]] && s=$((s + BASH_REMATCH[1] * 60))
  [[ $d =~ ([0-9]+)s ]] && s=$((s + BASH_REMATCH[1]))
  echo $s
}

parse_load() {
  ramp= start_rate=0 rate= duration= vus= iterations= max_duration= then_rate= then_duration= max_vus= max_dropped=
  p99=1500 max_fail=0.01 test_type= name= full_output=false extra_env=()
  with_notif=false notif_hold=45m notif_start=
  while [ $# -gt 0 ]; do
    case "$1" in
      --rate) rate=$2; shift 2;;            --duration) duration=$2; shift 2;;
      --ramp) ramp=$2; shift 2;;            --start-rate) start_rate=$2; shift 2;;
      --vus) vus=$2; shift 2;;              --iterations) iterations=$2; shift 2;;
      --max-duration) max_duration=$2; shift 2;;
      --then-rate) then_rate=$2; shift 2;;  --then-duration) then_duration=$2; shift 2;;
      --max-vus) max_vus=$2; shift 2;;      --max-dropped) max_dropped=$2; shift 2;;
      --p99) p99=$2; shift 2;;              --max-fail) max_fail=$2; shift 2;;
      --test-type) test_type=$2; shift 2;;  --name) name=$2; shift 2;;
      --full-output) full_output=true; shift;;
      --with-notifications) with_notif=true; shift;;
      --notif-hold) notif_hold=$2; shift 2;; --notif-start) notif_start=$2; shift 2;;
      --) shift; extra_env=("$@"); break;;
      *) die "opzione sconosciuta: $1 (vedi $0 senza argomenti)";;
    esac
  done
}

gen_options() { # stampa il JSON delle options k6
  local thr_common first first_events
  thr_common="\"http_req_failed{name:producePayment}\": [{ \"threshold\": \"rate<$max_fail\", \"abortOnFail\": true, \"delayAbortEval\": \"1m\" }],
        \"http_req_duration{name:producePayment}\": [{ \"threshold\": \"p(99)<$p99\", \"abortOnFail\": true, \"delayAbortEval\": \"1m\" }]"
  if [ -n "$ramp" ]; then
    # --ramp "92:5m,92:20m,150:5m,150:20m": stage target:durata (target ripetuto = mantenimento)
    local stages="" prev=$start_rate peak=$start_rate total=0 sec st target dur
    IFS=',' read -ra st <<< "$ramp"
    for s in "${st[@]}"; do
      [[ $s =~ ^([0-9]+):([0-9hms]+)$ ]] || die "stage non valido: $s (formato target:durata)"
      target=${BASH_REMATCH[1]}; dur=${BASH_REMATCH[2]}; sec=$(to_sec "$dur")
      first_events=$(( ${first_events:-0} + (prev + target) * sec / 2 ))
      total=$((total + sec)); prev=$target; [ "$target" -gt "$peak" ] && peak=$target
      stages="$stages${stages:+, }{ \"target\": $target, \"duration\": \"$dur\" }"
    done
    duration="${total}s"
    max_dropped=${max_dropped:-$((first_events / 100 > 1 ? first_events / 100 : 1))}
    first="\"main\": { \"executor\": \"ramping-arrival-rate\", \"startRate\": $start_rate, \"timeUnit\": \"1s\",
            \"stages\": [ $stages ], \"gracefulStop\": \"30s\",
            \"preAllocatedVUs\": $(( peak / 2 > 1 ? peak / 2 : 1 )), \"maxVUs\": ${max_vus:-$((peak * 3))},
            \"env\": { \"MAX_EVENTS\": \"$first_events\" } }"
    thr_common="$thr_common,
        \"dropped_iterations{scenario:main}\": [{ \"threshold\": \"count<$max_dropped\", \"abortOnFail\": true, \"delayAbortEval\": \"1m\" }]"
  elif [ -n "$rate" ]; then
    [ -n "$duration" ] || die "--rate richiede --duration"
    first_events=$((rate * $(to_sec "$duration")))
    max_dropped=${max_dropped:-$((first_events / 100))}
    first="\"main\": { \"executor\": \"constant-arrival-rate\", \"rate\": $rate, \"timeUnit\": \"1s\", \"duration\": \"$duration\",
            \"gracefulStop\": \"30s\", \"preAllocatedVUs\": $(( rate / 2 > 1 ? rate / 2 : 1 )), \"maxVUs\": ${max_vus:-$((rate * 3))},
            \"env\": { \"MAX_EVENTS\": \"$first_events\" } }"
    thr_common="$thr_common,
        \"dropped_iterations{scenario:main}\": [{ \"threshold\": \"count<$max_dropped\", \"abortOnFail\": true, \"delayAbortEval\": \"1m\" }]"
  elif [ -n "$iterations" ]; then
    [ -n "$vus" ] && [ -n "$max_duration" ] || die "--iterations richiede --vus e --max-duration"
    first_events=$iterations
    first="\"main\": { \"executor\": \"shared-iterations\", \"vus\": $vus, \"iterations\": $iterations,
            \"maxDuration\": \"$max_duration\", \"gracefulStop\": \"10s\", \"env\": { \"MAX_EVENTS\": \"$iterations\" } }"
  else
    die "serve --rate/--duration, --ramp, --iterations/--vus/--max-duration oppure --test-type"
  fi
  local second=""
  if [ -n "$then_rate" ]; then
    [ -n "$then_duration" ] || die "--then-rate richiede --then-duration"
    local start=${duration:-$max_duration}
    second=",
    \"steady\": { \"executor\": \"constant-arrival-rate\", \"startTime\": \"$start\", \"rate\": $then_rate, \"timeUnit\": \"1s\",
            \"duration\": \"$then_duration\", \"preAllocatedVUs\": $(( then_rate / 2 > 1 ? then_rate / 2 : 1 )), \"maxVUs\": $((then_rate * 5)),
            \"env\": { \"ITERATION_OFFSET\": \"$first_events\" } }"
  fi
  local notif=""
  if [ "$with_notif" == "true" ]; then
    # default: notifiche in parallelo alla fase a regime (--then-rate), non durante il pregresso
    if [ -z "$notif_start" ]; then
      if [ -n "$then_rate" ]; then notif_start=${duration:-$max_duration}; else notif_start=0s; fi
    fi
    to_sec "$notif_hold" > /dev/null; to_sec "$notif_start" > /dev/null
    # stesso profilo di w7w6F24Test.js: scenario:target:startRate:exec:test_type
    for sc in w7_test:40:5:analogicSoakTest:analogicSoakTest f24_test:10:5:f24SoakTest:f24SoakTest               w6_test:10:1:digitalSoakTest:digitalSoakTest; do
      IFS=: read -r sname starget srate sexec stag <<< "$sc"
      notif="$notif,
    \"$sname\": { \"executor\": \"ramping-arrival-rate\", \"startTime\": \"$notif_start\", \"timeUnit\": \"1s\",
            \"startRate\": $srate, \"preAllocatedVUs\": 200, \"maxVUs\": 9000,
            \"stages\": [ { \"target\": 5, \"duration\": \"10s\" }, { \"target\": $starget, \"duration\": \"15m\" },
                        { \"target\": $starget, \"duration\": \"$notif_hold\" }, { \"target\": 5, \"duration\": \"0s\" },
                        { \"target\": 5, \"duration\": \"10s\" } ],
            \"tags\": { \"test_type\": \"$stag\" }, \"exec\": \"$sexec\" }"
    done
  fi
  cat <<EOF
{
    "setupTimeout": "240s",
    "maxRedirects": 0,
    "summaryTrendStats": ["avg", "min", "med", "max", "p(95)", "p(99)", "p(99.99)", "count"],
    "scenarios": {
    $first$second$notif
    },
    "thresholds": {
        $thr_common
    }
}
EOF
}

cmd=${1:-}; shift || true
case "$cmd" in
  plan)
    parse_load "$@"; gen_options
    ;;
  start)
    parse_load "$@"
    [ -f "$ENV_FILE" ] || die "env file $ENV_FILE inesistente (imposta ENV_FILE)"
    if [ "$with_notif" == "true" ]; then
      [ -z "$test_type" ] || die "--with-notifications non si combina con --test-type"
      for k in BASE_PATH API_KEY PA_TAX_ID; do
        { grep -qE "^$k=." "$ENV_FILE" || printf '%s
' "${extra_env[@]}" | grep -qE "^$k=."; }           || die "--with-notifications richiede $k nell'env file o dopo '--'"
      done
      K6_SCRIPT=${K6_SCRIPT_USER:-src/PaymentEventsWithNotificationsTest.js}
    else
      K6_SCRIPT=${K6_SCRIPT_USER:-src/PaymentEventsTest.js}
    fi
    if [ -n "$test_type" ]; then
      [ -f "src/modules/test-types/$test_type.json" ] || die "src/modules/test-types/$test_type.json inesistente"
      run=${name:-${test_type}_$(date +%d%m%Y_%H%M)}
    else
      opts=$(gen_options)
      if [ -n "$ramp" ]; then label="ramp${start_rate}to${ramp##*,}"; label=${label%%:*}rps
      elif [ -n "$rate" ]; then label="${rate}rps_${duration}"; else label="shared${vus}vu_${iterations}"; fi
      [ "$with_notif" == "true" ] && label="${label}_notif"
      run=${name:-payment_${label}_$(date +%d%m%Y_%H%M)}
    fi
    [ -e "$OUT/$run" ] && die "outputs/$run esiste gia'"
    # quota di eventi su notifiche reali: l'ultimo valore vince ("--" sovrascrive l'env file)
    ratio=$( { grep -E '^SEND_EVENT_RATIO=' "$ENV_FILE" || true; for kv in "${extra_env[@]}"; do echo "$kv"; done; }       | grep -E '^SEND_EVENT_RATIO=' | tail -1 | cut -d= -f2- | tr -d '[:space:]"'"'" )
    [ -n "$ratio" ] || die "SEND_EVENT_RATIO mancante: aggiungi '-- SEND_EVENT_RATIO=0.06' (quota eventi su notifiche reali)"
    awk -v r="$ratio" 'BEGIN { exit !(r ~ /^(0(\.[0-9]+)?|1(\.0+)?)$/) }' || die "SEND_EVENT_RATIO non valido: $ratio (atteso fra 0 e 1)"
    if awk -v r="$ratio" 'BEGIN { exit !(r > 0.06) }'; then
      echo "ATTENZIONE: SEND_EVENT_RATIO=$ratio, cioe' il $(awk -v r="$ratio" 'BEGIN{print r*100}')% degli eventi su notifiche REALI di TEST."
      read -r -p "Confermi? Scrivi 'si' per procedere: " ans < /dev/tty || ans=
      [ "$ans" == "si" ] || die "run annullata"
    fi
    mkdir -p "$OUT/$run"
    { grep -v '^TEST_TYPE=' "$ENV_FILE"; echo "TEST_TYPE=${test_type:-_run}"; for kv in "${extra_env[@]}"; do echo "$kv"; done; } > "$OUT/.env_$run"
    [ -z "$test_type" ] && echo "$opts" > "$OUT/$run/k6-options.json"
    # parametri della run, senza segreti (solo i KEY=VAL passati a mano)
    { echo "date=$(date -Is)"; echo "git=$(git -c safe.directory="$PWD" rev-parse --short HEAD 2>/dev/null)"
      echo "args=$*"; echo "script=$K6_SCRIPT"; echo "SEND_EVENT_RATIO=$ratio"
      if [ "$with_notif" == "true" ]; then echo "WITH_PAYMENT=$( { grep -E '^WITH_PAYMENT=' "$ENV_FILE" || true; printf '%s
' "${extra_env[@]}"; } | grep -E '^WITH_PAYMENT=' | tail -1 | cut -d= -f2-)"; fi; } > "$OUT/$run/run-params.txt"
    light=true; [ "$full_output" == "true" ] && light=false
    K6_SCRIPT=$K6_SCRIPT LIGHT_OUTPUT=$light CONTAINER_NAME=$(container_of "$run") \
      K6_OPTIONS_FILE=$([ -z "$test_type" ] && echo "$PWD/$OUT/$run/k6-options.json") REUSE_RUN_DIR=true \
      setsid nohup bash -c './local-start-docker.sh "$1" "$2" run; rm -f "$1"' _ "$OUT/.env_$run" "$run"       > "$OUT/.launcher_$run.log" 2>&1 < /dev/null &
    # setsid: la run sopravvive alla chiusura della sessione SSM; l'env temporaneo si cancella a fine run
    echo "Avviata run '$run' (script=$K6_SCRIPT, light=$light, SEND_EVENT_RATIO=$ratio)."
    echo "  log:   $0 logs $run      stato: $0 status $run      fine: $0 archive $run"
    ;;
  list)
    df -h --output=avail,pcent . | tail -1 | awk '{print "Spazio libero: "$1" (usato "$2")"}'
    for r in $(ls -1t "$OUT" 2>/dev/null); do
      st=finita; is_running "$r" && st=IN_CORSO
      [ -f "$OUT/$r/.archived" ] && st="$st,archiviata"
      printf "%-55s %8s  %s\n" "$r" "$(du -sh "$OUT/$r" | cut -f1)" "$st"
    done
    ;;
  status)
    run=${1:-$(last_run)}; [ -n "$run" ] || die "nessuna run"
    if is_running "$run"; then echo "Run $run: IN CORSO"; else echo "Run $run: non in esecuzione"; fi
    tail -5 "$OUT/.launcher_$run.log" 2>/dev/null || true
    tail -5 "$OUT/$run/console-output.txt" 2>/dev/null || true
    [ -f "$OUT/$run/summary.json" ] && echo "summary.json presente"
    ;;
  logs)
    run=${1:-$(last_run)}; tail -n 50 -F "$OUT/$run/console-output.txt"
    ;;
  stop)
    run=${1:-$(last_run)}; docker stop -t 60 "$(container_of "$run")"
    ;;
  archive)
    run=${1:-}; [ -n "$run" ] && [ -d "$OUT/$run" ] || die "uso: $0 archive <run> (vedi $0 list)"
    is_running "$run" && die "la run $run e' ancora in corso"
    cp -f "$OUT/.launcher_$run.log" "$OUT/$run/launcher.log" 2>/dev/null || true
    tgz="/tmp/$run.tgz"
    tar czf "$tgz" -C "$OUT" "$run"
    sum=$(sha256sum "$tgz" | cut -d' ' -f1)
    aws s3 cp "$tgz" "$S3_ARCHIVE/$run.tgz" --only-show-errors
    echo "$sum  $run.tgz" | aws s3 cp - "$S3_ARCHIVE/$run.tgz.sha256" --only-show-errors
    remote=$(aws s3 cp "$S3_ARCHIVE/$run.tgz" - | sha256sum | cut -d' ' -f1)
    [ "$remote" == "$sum" ] || die "sha256 non coincide dopo l'upload: NON cancello nulla"
    rm -f "$tgz"; touch "$OUT/$run/.archived"
    echo "Archiviata e verificata: $S3_ARCHIVE/$run.tgz (sha256 $sum)"
    read -r -p "Cancellare outputs/$run dall'EC2? [s/N] " ans < /dev/tty || ans=n
    if [ "$ans" == "s" ]; then rm -rf "${OUT:?}/$run" "$OUT/.launcher_$run.log"; echo "Cancellata."; fi
    ;;
  *)
    sed -n '2,38p' "$0"; exit 1
    ;;
esac
