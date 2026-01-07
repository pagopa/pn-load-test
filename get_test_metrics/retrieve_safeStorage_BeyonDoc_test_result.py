import argparse
import boto3
import json
from time import sleep
from datetime import datetime
from pathlib import Path

# --------------------------
# ARGUMENTS
# --------------------------
parser = argparse.ArgumentParser(description="SQS full reader")

parser.add_argument(
    "--queue-url",
    required=True,
    help="URL della coda SQS"
)

parser.add_argument(
    "--profile",
    required=True,
    help="Nome profilo AWS"
)

args = parser.parse_args()

# --------------------------
# CONFIG
# --------------------------
QUEUE_URL = args.queue_url
PROFILE = args.profile

BASE_DIR = Path.cwd()
ANOMALIES_FILE = BASE_DIR / "anomalies.ndjson"
FINAL_REPORT = BASE_DIR / "sqs_final_report.json"

MAX_MESSAGES = 10
WAIT_TIME = 1
VISIBILITY_TIMEOUT = 120
LOG_EVERY = 10_000

# --------------------------
# AWS
# --------------------------
def create_sqs_client():
    session = boto3.Session(profile_name=PROFILE)
    return session.client("sqs")

# --------------------------
# CLASSIFICAZIONE
# --------------------------
def classify_message(raw_body: str):
    try:
        body = json.loads(raw_body)
        detail_type = body.get("detail-type")
        detail = body.get("detail", {})
        status = detail.get("documentStatus")

        if status == "SAVED" and detail_type == "SafeStorageOutcomeEvent":
            return "SAVED"

        if status == "ERROR" and detail_type == "SafeStorageTransformEvent":
            return "ERROR"

        return "ANOMALY"

    except Exception:
        return "ANOMALY"

# --------------------------
# MAIN
# --------------------------
def main():
    sqs = create_sqs_client()
    total = 0
    saved = 0
    error = 0
    first_ts = None
    last_ts = None

    print(f"Avvio lettura completa della coda SQS")
    print(f"Output dir: {BASE_DIR}")

    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=MAX_MESSAGES,
                WaitTimeSeconds=WAIT_TIME,
                VisibilityTimeout=VISIBILITY_TIMEOUT
            )
        except Exception as e:
            print(f"Errore receive: {e} – retry 5s")
            sleep(5)
            continue

        messages = response.get("Messages", [])
        if not messages:
            break

        delete_entries = []

        for i, msg in enumerate(messages):
            total += 1
            raw_body = msg.get("Body", "")

            # timestamp min/max
            try:
                body = json.loads(raw_body)
                ts_str = body.get("time")
                if ts_str:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    if first_ts is None or ts < first_ts:
                        first_ts = ts
                    if last_ts is None or ts > last_ts:
                        last_ts = ts
            except Exception:
                pass

            # classificazione
            result = classify_message(raw_body)
            if result == "SAVED":
                saved += 1
            elif result == "ERROR":
                error += 1
            else:
                with open(ANOMALIES_FILE, "a") as f:
                    f.write(raw_body + "\n")

            delete_entries.append({
                "Id": str(i),
                "ReceiptHandle": msg["ReceiptHandle"]
            })

        # delete batch
        try:
            resp = sqs.delete_message_batch(
                QueueUrl=QUEUE_URL,
                Entries=delete_entries
            )
            if resp.get("Failed"):
                print(f"Delete parziale fallita: {resp['Failed']}")
        except Exception as e:
            print(f"Delete batch fallita: {e}")

        # log avanzamento
        if total % LOG_EVERY == 0:
            print(f"Letti {total:,} messaggi")

    write_report(total, saved, error, first_ts, last_ts)

    print(f"Completato. Totale messaggi letti: {total:,}")

# --------------------------
# REPORT
# --------------------------
def write_report(total, saved, error, first_ts, last_ts):
    report = {
        "totalMessagesRead": total,
        "savedOutcomeEvents": saved,
        "errorTransformEvents": error,
        "anomalousMessagesFile": str(ANOMALIES_FILE),
        "firstMessageTimestamp": first_ts.isoformat() if first_ts else None,
        "lastMessageTimestamp": last_ts.isoformat() if last_ts else None
    }

    with open(FINAL_REPORT, "w") as f:
        json.dump(report, f, indent=2)

# --------------------------
# ENTRYPOINT
# --------------------------
if __name__ == "__main__":
    main()