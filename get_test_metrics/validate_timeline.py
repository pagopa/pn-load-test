# pip install boto3
# python ./get_test_metrics/validate_timeline.py outputs/notification-request-ids-small.txt outputs/processed-timelines.json --profile sso_pn-core-dev
#   or:
# python ./get_test_metrics/validate_timeline.py outputs/notification-request-ids.txt outputs/processed-timelines.json --profile sso_pn-core-dev

import base64
import sys
import json

import boto3



table_name = 'pn-Timelines'

# get filename from the command-line argument
if len(sys.argv) != 5 or sys.argv[3].strip() != '--profile':
    print('Usage: python ./get_test_metrics/validate_timeline.py <source_filename> <destination_filename> --profile <profile_name>')
    sys.exit(1)

source_filename = sys.argv[1]
destination_filename = sys.argv[2]
profile_name = sys.argv[4]

session = boto3.Session(profile_name=profile_name)
dynamodb = session.client('dynamodb')


# read a text file and for each line, putting in a set to remove duplicates
def get_unique_ids_from_source_filename(filename: str) -> list[str]:
    ids = set()
    try:
        with open(filename) as f:
            for line in f:
                ids.add(line.strip())
    except FileNotFoundError:
        print(f'File {filename} not found')
        sys.exit(1)

    return list(ids)

# take a list of base64 encoded ids and return a list of decoded ids
def decode_ids(ids: list[str]) -> list[str]:
    return [base64.b64decode(id).decode('utf-8') for id in ids if id != '']

# for each passed iun, get from DynamoDB the records from "pn-Timelines" table
# and process the corresponding timeline
def get_timelines(iuns: list[str]) -> list:
    processed = []

    for iun in iuns:
        try:
            response = dynamodb.query(
                TableName=table_name,
                KeyConditionExpression='iun = :val',
                ExpressionAttributeValues={
                    ':val': {'S': iun}
                }
            )
        except:
            print(f'Problem querying DynamoDB table {table_name} for iun {iun}')
            sys.exit(1)

        items = response.get('Items', [])
        if len(items) > 0:

            new_element = {
                "iun": items[0]['iun']['S'],
                "isNotRefused": False,
                "isRefined": False,
                "timeline": []
            }

            for item in items:
                timeline_element_id = item['timelineElementId']['S']
                category = item['category']['S']
                timestamp = item['timestamp']['S']

                if category == 'REFINEMENT':
                    new_element["isRefined"] = True
                elif category == 'REQUEST_ACCEPTED':
                    new_element["isNotRefused"] = True

                new_element["timeline"].append({
                    "timelineElementId": timeline_element_id,
                    "category": category,
                    "timestamp": timestamp
                });
    
            processed.append(new_element)

    return processed

# write the processed timelines to a file
def write_to_file(processed: list, filename: str):
    try:
        with open(filename, 'w') as f:
            json.dump(processed, f, indent=4)
    except:
        print(f'Problem writing to {filename}')
        sys.exit(1)

if __name__ == '__main__':
    ids = get_unique_ids_from_source_filename(filename=source_filename)
    iuns = decode_ids(ids)
    processed = get_timelines(iuns)
    write_to_file(processed, destination_filename)