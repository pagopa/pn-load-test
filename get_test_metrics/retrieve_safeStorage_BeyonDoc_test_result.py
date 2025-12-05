import boto3
import json
import re

# --------------------------
# CONFIGURAZIONE
# --------------------------
QUEUE_URL = "https://sqs.eu-south-1.amazonaws.com/830192246553/pn-safestorage-to-qa"
PROFILE = "sso_pn-core-dev"

INPUT_FILE = "/Users/matteo/Documents/pagopa/pn-load-test/console-output.txt"
OUTPUT_FILE = "/Users/matteo/Documents/pagopa/pn-load-test/pdf_output.txt"

# --------------------------
# FUNZIONI
# --------------------------
def create_sqs_client():
    """Crea la sessione AWS usando il profilo SSO."""
    session = boto3.Session(profile_name=PROFILE)
    return session.client("sqs")


def receive_messages(sqs):
    """Scarica tutti i messaggi dalla coda (senza eliminarli)."""
    messages = []
    while True:
        resp = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=1,
            MessageAttributeNames=["All"],
            AttributeNames=["All"],
        )
        if "Messages" not in resp:
            break
        messages.extend(resp["Messages"])
    return messages


def extract_pdf_names(file_path):
    """
    Legge il file di testo in input e recupera i nome dei pdf caricati
    ritornandoli nella lista pdf_names
    """
    pdf_names = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if "PDF FILE NAME:" in line:
                # Prende la parola subito dopo "PDF FILE NAME:" fino a fine riga
                match = re.search(r"PDF FILE NAME:\s*([^\s\r\n]+)", line)
                if match:
                    pdf_name = match.group(1).strip()
                    pdf_names.append(pdf_name)
    return pdf_names


def build_pdf_status_map(messages):
    """
    Crea un dizionario {key: documentStatus} da tutti i messaggi letti precedentemente dalla coda SQS.
    Il messaggio ha il seguente formato:
        id              -> identificativo del messaggio nella coda
        ...
        detail {
            key             -> nome del pdf caricato
            documentStatus  -> SAVED o ERROR in base all'esito del caricamento
        }
        ...
    """
    pdf_status_map = {}
    for msg in messages:
        try:
            body = json.loads(msg["Body"])
            msg_id = body.get("id")
            detail = body.get("detail", {})
            key = detail.get("key")
            status = detail.get("documentStatus")
            if key and status and msg_id:
                pdf_status_map[key] = (status, msg_id)
        except Exception:
            continue
    return pdf_status_map


# --------------------------
# MAIN
# --------------------------
def main():
    # Leggi PDF dal file di input
    pdf_names = extract_pdf_names(INPUT_FILE)
    print(f"Trovati {len(pdf_names)} PDF nel file di input")

    # Recupera tutti i messaggi dalla coda
    sqs = create_sqs_client()
    print("Recupero dei messaggi dalla coda SQS...")
    all_msgs = receive_messages(sqs)
    print(f"Trovati {len(all_msgs)} messaggi nella coda")

    # Costruisci mappa {key: (documentStatus, messageId)} a partire dai messaggi recuperati dalla coda
    pdf_status_map = build_pdf_status_map(all_msgs)

    # Utilizza la mappa precedente per raggruppare in base allo status
    saved_pdfs = []
    error_pdfs = []
    not_found_pdfs = []

    for pdf in pdf_names:
        entry = pdf_status_map.get(pdf)
        if entry:
            status, msg_id = entry
            if status == "SAVED":
                saved_pdfs.append((pdf, status, msg_id))
            elif status == "ERROR":
                error_pdfs.append((pdf, status, msg_id))
            else:
                not_found_pdfs.append(pdf)
        else:
            not_found_pdfs.append(pdf)

    # Prepara il file di output con il report dei dati
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out_file:
        out_file.write("=== PDF SAVED ===\n")
        for pdf, status, msg_id in saved_pdfs:
            out_file.write(f"{pdf} -> (messageId: {msg_id})\n")

        out_file.write("\n=== PDF ERROR ===\n")
        for pdf, status, msg_id in error_pdfs:
            out_file.write(f"{pdf} -> (messageId: {msg_id})\n")

        out_file.write("\n=== PDF NOT FOUND ===\n")
        for pdf in not_found_pdfs:
            out_file.write(f"{pdf}\n")

        out_file.write("\n=== RESOCONTO ===\n")
        out_file.write(f"Totale PDF ricercati: {len(pdf_names)}\n")
        out_file.write(f"Totale PDF con documentStatus = SAVED: {len(saved_pdfs)}\n")
        out_file.write(f"Totale PDF con documentStatus = ERROR: {len(error_pdfs)}\n")
        out_file.write(f"Totale PDF NON TROVATI: {len(not_found_pdfs)}\n")

    print(f"Risultati scritti in {OUTPUT_FILE}")


if __name__ == "__main__":
    main()