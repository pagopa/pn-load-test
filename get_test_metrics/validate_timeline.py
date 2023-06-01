# if the run fails on dynamoDB access, first run for logging in to AWS SSO:
# aws sso login --profile sso_pn-core-dev

# first launch:
# grep notificationRequestId outputs/console-output.txt \
#  | jq -r '.msg' \
#  | grep REQUEST-ID-LOG \
#  | sed -E 's/.*notificationRequestId\":\"//g' \
#  | sed -E 's/\",\"paProtocolNumber.*//g' > outputs/notification-request-ids.txt

# pip install boto3
#
#
# python3 ./get_test_metrics/validate_timeline.py outputs/notification-request-ids-small.txt outputs/processed-timelines-small.json --profile sso_pn-core-dev
#   or:
# python3 ./get_test_metrics/validate_timeline.py outputs/notification-request-ids.txt outputs/processed-timelines.json --profile sso_pn-core-dev
#
# tested with Python 3.11

# starting from a list of base64 encoded ids from file, get the corresponding timelines from DynamoDB, ordering each timeline by the timestamp of the last element,
# and ordering the timeline so that the first element is the one with the oldest timestamp of the last element, and write the processed timelines to a file

# get the IUNs where the timeline correctly completed, on the output file, with:
# cat outputs/processed-timelines.json | jq -r '.[] | select(.isRefined == true) | .iun' > outputs/iuns-timelines-completed.txt

import base64
import sys
import json
import time
from dateutil.parser import parse
from dateutil.parser import ParserError

import boto3



timelines_table_name = 'pn-Timelines'
futureaction_table_name = 'pn-FutureAction'


# get filename from the command-line argument
if len(sys.argv) != 5 or sys.argv[3].strip() != '--profile':
    print('Usage: python3 ./validate_timeline.py <source_filename> <destination_filename> --profile <profile_name>')
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
    not_processed = []

    for iun in iuns:
        print(f'Processing iun {iun}...')
        try:
            response = dynamodb.query(
                TableName=timelines_table_name,
                KeyConditionExpression='iun = :val',
                ExpressionAttributeValues={
                    ':val': {'S': iun}
                }
            )
        except:
            print(f'Problem querying DynamoDB table {timelines_table_name} for iun {iun}')
            sys.exit(1)

        items = response.get('Items', [])
        if len(items) > 0:

            new_element = {
                "iun": items[0]['iun']['S'],
                "isNotRefused": False,
                "isRefined": False,
                "lastElementTimestamp": None,
                "validationTime": None,
                "notificationSentAt": None,
                "validationTimeStamp": None,
                "isMaxValidationTime": False,
                "timeline": []
            }

            # for each item in the timeline, add it to the new_element["timeline"] array
            for item in items:
                timeline_element_id = item['timelineElementId']['S']
                category = item['category']['S']
                timestamp = item['timestamp']['S']
                notificationSentAt = item['notificationSentAt']['S']


                if category == 'REFINEMENT':
                    new_element["isRefined"] = True
                elif category == 'REQUEST_ACCEPTED':
                    new_element["isNotRefused"] = True

                if category == 'REQUEST_ACCEPTED' or category == 'REQUEST_REFUSED':
                    # new_element["validationTime"] is the time between the notification being sent 
                    # (equal for each element of that timeline) and the request being accepted/refused,
                    # in seconds
                    try:
                        new_element["validationTime"] = int(parse(timestamp).timestamp()) - int(parse(notificationSentAt).timestamp())
                        new_element["validationTimeStamp"] = timestamp
                    except ParserError:
                        pass

                new_element["notificationSentAt"] = notificationSentAt # we could perform this assignment only once, but it's not a big deal

                new_element["timeline"].append({
                    "timelineElementId": timeline_element_id,
                    "category": category,
                    "timestamp": timestamp
                });
            
                # sort new_element["timeline"] by timestamp
                new_element["timeline"].sort(key=lambda x: x["timestamp"])

                new_element["lastElementTimestamp"] = new_element["timeline"][-1]["timestamp"]
    
            processed.append(new_element)

    print(f'Found {len(processed)} timelines')

    # we then add all the elements that are in iuns but not in processed
    elements_not_found = [iun for iun in iuns if iun not in [element["iun"] for element in processed]]
    print(f'{len(elements_not_found)} elements not found in DynamoDB')

    for iun in elements_not_found:
        new_element = {
            "iun": iun,
            "isNotRefused": False,
            "isRefined": False,
            "lastElementTimestamp": None,
            "validationTime": None,
            "notificationSentAt": None,
            "validationTimeStamp": None,
            "isMaxValidationTime": False,
            "timeline": []
        }
        not_processed.append(new_element)

    # order processed by timestamp on the last element in each timeline (it is the REFINEMENT timestamp, for successful timelines)
    print('Ordering timelines based on the timestamp of the last element...')
    processed.sort(key=lambda x: x["timeline"][-1]["timestamp"])

    # concatenate processed and not_processed, with not_processed first
    processed = not_processed + processed

    return processed

# write the processed timelines to a file
def write_to_file(processed: list, filename: str):
    try:
        with open(filename, 'w') as f:
            json.dump(processed, f, indent=4)
    except:
        print(f'Problem writing to {filename}')
        sys.exit(1)

# perform a scan on the "pn-FutureAction" table, with pagination using the LastEvaluatedKey
# to get all the records
def get_future_actions() -> list:
    try:
        response = dynamodb.scan(
            TableName=futureaction_table_name,
            FilterExpression='attribute_exists(iun)'
        )
    except:
        print(f'Problem scanning DynamoDB table {futureaction_table_name}')
        sys.exit(1)

    items = response.get('Items', [])

    while 'LastEvaluatedKey' in response:
        response = dynamodb.scan(
            TableName=futureaction_table_name,
            FilterExpression='attribute_exists(iun)',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response.get('Items', []))

    return items

# function that for each timeline, checks if there are future actions for that iun,
# and if there are, adds them to the timeline
def complete_timelines_with_future_actions(processed: list, future_actions: list) -> list:
    for element in processed:
        iun = element["iun"]
        future_actions_for_iun = [item for item in future_actions if item["iun"]["S"] == iun]
        element["futureActions"] = [] # initialize the futureActions array, even in case we don't have any futureActions
        if len(future_actions_for_iun) > 0:
            for item in future_actions_for_iun:
                element["futureActions"].append({
                    "timeSlot": item["timeSlot"]["S"],
                    "actionId": item["actionId"]["S"],
                    "notBefore": item["notBefore"]["S"],
                    "type": item["type"]["S"]
                })
    return processed


if __name__ == '__main__':
    start = time.time()

    print(f'Processing {source_filename}...')
    ids = get_unique_ids_from_source_filename(source_filename)
    
    print(f'Found {len(ids)} unique rows, decoding...')
    iuns = decode_ids(ids)
    
    print(f'Decoded {len(iuns)} ids, querying DynamoDB for timelines and ordering them based on the timestamp of the last element...')
    processed = get_timelines(iuns)
    
    print(f'Found {len(processed)} timelines, querying DynamoDB for future actions...')
    future_actions = get_future_actions();
    
    print(f'Found {len(future_actions)} future actions, completing the timelines...')
    processed_with_future_actions = complete_timelines_with_future_actions(processed, future_actions)
    
    print(f'Processed {len(processed_with_future_actions)} timelines, writing to {destination_filename}...')
    write_to_file(processed_with_future_actions, destination_filename)

    end = time.time()
    print(f'Finished in {end - start} seconds')
