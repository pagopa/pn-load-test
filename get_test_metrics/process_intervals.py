# source /Users/marcoiannaccone/dev/repos/work/PagoPA/pn-load-test/venv/bin/activate
#
# python3 ./get_test_metrics/process_intervals.py --processed-timelines outputs/Soak__fake_24_giugno_0433/processed-timelines.json --intervals outputs/Soak__fake_24_giugno_0433/intervals.json

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
        source_processed_timelines = sys.argv[2];
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
        for event in iun['timeline']:
            if event['category'] == value[0]:
                processed_iun[key] = {
                    'start': event['timestamp'],
                    'end': None
                }
            elif event['category'] == value[1]:
                processed_iun[key]['end'] = event['timestamp']

                # if both end and start are not None, we replace the key with the interval in seconds
                if processed_iun[key]['start'] is not None and processed_iun[key]['end'] is not None:
                    try:
                        processed_iun[key] = int(parse(processed_iun[key]['end']).timestamp()) - int((parse(processed_iun[key]['start']).timestamp()))
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