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
# source /Users/marcoiannaccone/dev/repos/work/PagoPA/pn-load-test/venv/bin/activate
#
# python3 ./get_test_metrics/validate_timeline.py outputs/notification-request-ids.txt outputs/processed-timelines.json outputs/stats.json --profile sso_pn-core-dev
#
# tested with Python 3.11
#
# python3 ./get_test_metrics/validate_timeline.py outputs/2023-06-12_23-21__W6_30iter_30min_test_1206-2321/notification-request-ids.txt outputs/2023-06-12_23-21__W6_30iter_30min_test_1206-2321/processed-timelines.json outputs/2023-06-12_23-21__W6_30iter_30min_test_1206-2321/stats.json --profile sso_pn-core-dev

# starting from a list of base64 encoded ids from file, get the corresponding timelines from DynamoDB, ordering each timeline by the timestamp of the last element,
# and ordering the timeline so that the first element is the one with the oldest timestamp of the last element, and write the processed timelines to a file

# get the IUNs where the timeline correctly completed, on the output file, with:
# cat outputs/processed-timelines.json | jq -r '.[] | select(.isRefined == true) | .iun' > outputs/iuns-timelines-completed.txt

import base64
import sys
import json
import time
import datetime
from dateutil.parser import parse
from dateutil.parser import ParserError
from concurrent.futures import ThreadPoolExecutor

import boto3


timelines_table_name = 'pn-Timelines'
futureaction_table_name = 'pn-FutureAction'


# get filename from the command-line argument
if len(sys.argv) != 6 or sys.argv[4].strip() != '--profile':
    print('Usage: python3 ./validate_timeline.py <source_filename> <destination_filename> <destination_stats_filename> --profile <profile_name>')
    sys.exit(1)

source_filename = sys.argv[1]
destination_filename = sys.argv[2]
destination_stats_filename = sys.argv[3]
profile_name = sys.argv[5]

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
    read_from_db = []

    def create_new_element():
        return {
            "iun": None,
            "isNotRefused": False,
            "isRefined": False,
            "lastElementTimestamp": None,
            "validationTime": None,
            "notificationSentAt": None,
            "validationTimeStamp": None,
            "isMaxValidationTime": False,
            "timeline": []
        }
    
    def read_info_for_one_iun_from_db( iun_and_index: dict) -> dict:
        iun = iun_and_index['iun'].strip() # for removing spaces or newlines at ends
        idx = iun_and_index['idx']
        iuns_quantity = iun_and_index['tot']
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
        
        new_element = create_new_element()
        new_element["iun"] = iun

        if len(items) > 0:
            # for each item in the timeline, add it to the new_element["timeline"] array
            for item in items:
                timeline_element_id = item['timelineElementId']['S']
                category = item['category']['S']
                timestamp = item['timestamp']['S']
                notification_sent_at = item['notificationSentAt']['S']

                if category == 'REFINEMENT':
                    new_element["isRefined"] = True
                elif category == 'REQUEST_ACCEPTED':
                    new_element["isNotRefused"] = True

                if category == 'REQUEST_ACCEPTED' or category == 'REQUEST_REFUSED':
                    # new_element["validationTime"] is the time between the notification being sent 
                    # (equal for each element of that timeline) and the request being accepted/refused,
                    # in seconds
                    try:
                        new_element["validationTime"] = int(parse(timestamp).timestamp()) - int(parse(notification_sent_at).timestamp())
                        new_element["validationTimeStamp"] = timestamp
                    except ParserError:
                        pass

                new_element["notificationSentAt"] = notification_sent_at # we could perform this assignment only once, but it's not a big deal

                new_element["timeline"].append({
                    "timelineElementId": timeline_element_id,
                    "category": category,
                    "timestamp": timestamp
                });
            
            # sort new_element["timeline"] by timestamp
            new_element["timeline"].sort(key=lambda x: x["timestamp"])

            new_element["lastElementTimestamp"] = new_element["timeline"][-1]["timestamp"]
        
        if idx % 100 == 0:
            print(f'Analyzed {idx}/{iuns_quantity} timelines at {datetime.datetime.now()}')
        return new_element

    iuns_quantity = len( iuns )
    iuns_and_index = [{'iun':iun, 'idx':idx, 'tot': iuns_quantity} for idx,iun in enumerate(iuns)]
    with ThreadPoolExecutor(max_workers=10) as executor:
        read_from_db_gen = executor.map( read_info_for_one_iun_from_db, iuns_and_index )
    
    read_from_db = [ x for x in read_from_db_gen ]
    print(f'Analyzed {len(read_from_db)} timelines')

    # we find in processed the element with the max validationTime and set its isMaxValidationTime to True
    timelines_validation_times = [element["validationTime"] for element in read_from_db if element["validationTime"] is not None]
    if (len(timelines_validation_times) > 0): # only if the list is not empty
        max_validation_time = max(timelines_validation_times)
        for element in read_from_db:
            if element["validationTime"] == max_validation_time:
                element["isMaxValidationTime"] = True
    # there could be in theory more than one with the flag set, but it's unlikely

    # we then add all the elements that are in iuns but not in processed
    elements_not_found = [ element["iun"] for element in read_from_db if len( element["timeline"]) == 0 ]
    print(f'{len(elements_not_found)} elements not found in DynamoDB')

    # order processed by timestamp on the last element in each timeline (it is the REFINEMENT timestamp, for successful timelines)
    print('Ordering timelines based on the timestamp of the last element...')
    read_from_db.sort(key=lambda x: x["timeline"][-1]["timestamp"] if len( x["timeline"] ) > 0 else "1900-01-01T00:00:00.000000000Z" )

    return read_from_db

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
    # filter out elements starting with "check_attachment_retention"
    items = [item for item in items if not str(item['actionId']).strip().startswith('check_attachment_retention')]

    while 'LastEvaluatedKey' in response:
        try: 
            response = dynamodb.scan(
                TableName=futureaction_table_name,
                FilterExpression='attribute_exists(iun)',
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            iter_items = response.get('Items', [])
            iter_items = [item for item in iter_items if not str(item['actionId']).strip().startswith('check_attachment_retention')]
            items.extend(iter_items)
        except:
            print(f'Problem scanning DynamoDB table {futureaction_table_name}')
            sys.exit(1)

    print(f'Filtered out {len(items)} future actions')

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

    # write stats to dictionary
    stats = {
        "totalUniqueIuns": len(iuns),
        "notEmptytimelines": len([element for element in processed if len(element["timeline"]) > 0]),
        "emptyTimelines": len([element for element in processed if len(element["timeline"]) == 0]),
        "totalTimelinesNotRefused": len([element for element in processed if element["isNotRefused"] == True]),
        "totalTimeLinesRefusedOrEmptyTimelines": len([element for element in processed if element["isNotRefused"] == False]),
        "totalTimelinesRefined": len([element for element in processed if element["isRefined"] == True]),
        "totalTimeLinesNotRefined": len([element for element in processed if element["isRefined"] == False]),
        "lastElementTimestamp": processed[-1]["lastElementTimestamp"],
        #"maxValidationTimeSeconds": max([element["validationTime"] for element in processed if element["validationTime"] is not None]),
        "iunsOfRefusedOrEmptyTimelines": [element["iun"] for element in processed if element["isNotRefused"] == False],
        "iunsOfNotRefinedTimelinesExcludingRefused": [element["iun"] for element in processed if element["isRefined"] == False and element["isNotRefused"] == True],
    }
    
    last_element_timestamp_list = [element["iun"] for element in processed if element["lastElementTimestamp"] is not None]
    if len(last_element_timestamp_list) > 0:
        stats["iunWithLastElementTimestamp"] = last_element_timestamp_list[0]
    else:
        stats["iunWithLastElementTimestamp"] = None

    max_validation_time_list = [element["iun"] for element in processed if element["isMaxValidationTime"] == True]
    if len(max_validation_time_list) > 0:
        stats["iunWithMaxValidationTime"] = max_validation_time_list[0]
    else:
        stats["iunWithMaxValidationTime"] = None

    validation_times_list = [element["validationTime"] for element in processed if element["validationTime"] is not None]
    if len(validation_times_list) > 0:
        stats["maxValidationTimeSeconds"] = max(validation_times_list)
    

    # write stats to json file
    try:
        with open(destination_stats_filename, 'w') as f:
            json.dump(stats, f, indent=4)
    except:
        print(f'Problem writing to {destination_stats_filename}')
        sys.exit(1)
    
