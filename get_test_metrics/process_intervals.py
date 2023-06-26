# takes the processed-timelines.json and analizes the intervals between the relevant events, producing a JSON file
# containing an array of elements like this:
# 
#   {    
#       "iun": "NYMY-YMZP-EVJR-202306-L-1",
#       "notificationSentAt": "2023-06-24T02:33:57.325473850Z",
#       "intervAck": 77,
#       "intervAar": 530,
#       "intervDigital": 2217
#    }
#
#
# source /Users/marcoiannaccone/dev/repos/work/PagoPA/pn-load-test/venv/bin/activate
#
# python3 ./get_test_metrics/process_intervals.py --processed-timelines outputs/Soak__fake_24_giugno_0433/processed-timelines.json --intervals outputs/Soak__fake_24_giugno_0433/intervals.json
#
# example conversion to CSV of needed data, using jq:
#   jq -r '.[] | [.notificationSentAt, .intervAck] | @csv' outputs/Soak__fake_24_giugno_0433/intervals.json > outputs/Soak__fake_24_giugno_0433/intervals_intervAck.csv
#
# for having all data in the CSV, also printing field names in the first row, use:
#   jq -r '["notificationSentAt", "intervAck", "intervAar", "intervDigital"], (.[] | [.notificationSentAt, .intervAck, .intervAar, .intervDigital]) | @csv' outputs/Soak__fake_24_giugno_0433/intervals.json > outputs/Soak__fake_24_giugno_0433/intervals_all.csv

import json
import sys
import time
from dateutil.parser import parse
from dateutil.parser import ParserError

def main():
    if len(sys.argv) != 5:
        print("Usage: python3 process_intervals.py --processed-timelines <processed-timelines.json> --intervals <intervals.json>")
        sys.exit(1)

    # read json file "processed-timelines.json", getting an array of objects
    try:
        source_processed_timelines = sys.argv[2]
        output_processed_timelines = sys.argv[4]

        print(f'Processing {source_processed_timelines}...')

        output_ranges = []
        with open(source_processed_timelines, 'r') as f:
            try:
                timelines = json.load(f)

                # process the array of iun/timelines, getting the relavant intervals, if present
                for iun in timelines:
                    processed_iun = process_timeline_ranges_for_iun(iun)
                    output_ranges.append(processed_iun)

                # sort the array of iun/timelines by notificationSentAt
                output_ranges = sorted(output_ranges, key=lambda k: k['notificationSentAt'])
                
                # write the processed_iun array to a JSON file
                print(f'Writing {output_processed_timelines}...')
                try:
                    with open(output_processed_timelines, 'w') as f:
                        json.dump(output_ranges, f, indent=4)
                except FileNotFoundError:
                    print("Error: file not found")
                    sys.exit(1)
                except ValueError:
                    print("Error: invalid JSON")
                    sys.exit(1)

            except ValueError:
                print("Error: invalid JSON")
                sys.exit(1)
    except FileNotFoundError:
        print("Error: file not found")
        sys.exit(1)

def process_timeline_ranges_for_iun(iun):
    processed_iun = {
        'iun': iun['iun'],
        'notificationSentAt': iun['notificationSentAt'],
        'intervAck': None,
        'intervAar': None,
        'intervDigital': None,
    }

    if len(iun['timeline']) == 0:
        return processed_iun

    # check if the iun has the relevant intervals, reading them from pased dictionary of tuples
    intervals = {
        'intervAck': ('SENDER_ACK_CREATION_REQUEST', 'REQUEST_ACCEPTED'),
        'intervAar': ('AAR_CREATION_REQUEST', 'AAR_GENERATION'),
        'intervDigital': ('DIGITAL_DELIVERY_CREATION_REQUEST', 'DIGITAL_SUCCESS_WORKFLOW')
    }

    for key, value in intervals.items():
        interv_start = None
        interv_end = None
        
        for event in iun['timeline']:
            if event['category'] == value[0]:
                interv_start = event['timestamp']
            elif event['category'] == value[1]:
                interv_end = event['timestamp']

                # if both end and start are not None, we set the key with the interval in seconds
                if interv_start is not None and interv_end is not None:
                    try:
                        processed_iun[key] = int(parse(interv_end).timestamp()) - int((parse(interv_start).timestamp()))
                    except ParserError:
                        print(f'Error: invalid timestamp for {key} in {iun["iun"]}')
                        processed_iun[key] = None
                else:
                    processed_iun[key] = None
                    
                break

    return processed_iun

if __name__ == '__main__':
    start = time.time()

    main()

    end = time.time()
    print(f'Finished in {end - start} seconds')