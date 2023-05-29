# pip install boto3
# python ./get_test_metrics/validate_timeline.py outputs/notification-request-ids.txt

import base64
import sys
import boto3

session = boto3.Session(profile_name='sso_pn-core-dev')
dynamodb = session.client('dynamodb')
#dynamodb = boto3.client('dynamodb')

table_name = 'pn-Timelines'

# get filename from the command-line argument
if len(sys.argv) < 2:
    print('Please provide a filename as a command-line argument')
    sys.exit(1)
filename = sys.argv[1]

# read a text file and for each line, putting in a set to remove duplicates
def get_unique_ids(filename: str) -> list[str]:
    ids = set()
    with open(filename) as f:
        for line in f:
           ids.add(line.strip())
    return list(ids)

# take a list of base64 encoded ids and return a list of decoded ids
def decode_ids(ids: list[str]) -> list[str]:
    return [base64.b64decode(id).decode('utf-8') for id in ids]

# for each passed iun, get from DynamoDB the records from "pn-Timelines" table
# and process the corresponding timeline
def get_timelines(iuns: list[str]):
    for iun in iuns:
        response = dynamodb.query(
            TableName=table_name,
            KeyConditionExpression='iun = :val',
            ExpressionAttributeValues={
                ':val': {'S': iun}
            }
        )
        search_items = []
        items = response.get('Items', [])
        for item in items:
            #field1 = item['attribute1']['S']
            print(item)


if __name__ == '__main__':
    ids = get_unique_ids(filename=filename)
    iuns = decode_ids(ids)
    #print(iuns)
    get_timelines(iuns)