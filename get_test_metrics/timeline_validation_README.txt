configurazione ambiente:

- installare Python 3.11x, col relativo pip (il gestore paccheti)
- installare le dipendenze: dalla root:
    pip install -r requirements.txt
    (nota: così vengono installate globalmente, non in un virtual environment)


processing test:

- (se si sta usando un virtual environment, attivarlo)

- login ad aws nell'ambiente desiderato:
    aws sso login --profile sso_pn-core-dev

- estrazione iuns (due percorsi da aggiornare), dalla root folder:
    ./get_test_metrics/extract-notification-request-ids.sh outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/console-output.txt outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/notification-request-ids.txt

- processing timeline (tre percorsi da aggiornare), dalla root folder:
    python3 ./get_test_metrics/validate_timeline.py outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/notification-request-ids.txt outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/processed-timelines.json outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/stats.json --profile sso_pn-core-dev

- grafico e note grafico (due percorsi da aggiornare), dalla root folder:
    python3 ./get_test_metrics/graph.py outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/processed-timelines.json outputs/2023-06-08_22-41__W6_13iter_30min_0806-2241/graph.png

    prelevare anche le ultime righe stampate in output, con le statistiche:

    Max validationCount: 398
    Average validationCount: 71.2
    Median validationCount: 3.0
