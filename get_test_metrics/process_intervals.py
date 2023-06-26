# source /Users/marcoiannaccone/dev/repos/work/PagoPA/pn-load-test/venv/bin/activate
#
# python3 ./get_test_metrics/process_intervals.py --processed-timelines outputs/Soak__fake_24_giugno_0433/processed-timelines.json --intervals outputs/Soak__fake_24_giugno_0433/intervals.json

import json
import sys

def main():
    if len(sys.argv) != 5:
        print("Usage: python3 process_intervals.py --processed-timelines <processed-timelines.json> --intervals <intervals.json>")
        sys.exit(1)

    # read json file "processed-timelines.json", getting an array of objects
    try:
        source_processed_timelines = sys.argv[2];

        with open(source_processed_timelines, 'r') as f:
            try:
                timelines = json.load(f)
                # process the array of iun/timelines, getting the relavant intervals, if present
                for iun in timelines:
                    processed_iun = process_timelines_iun(iun)
                    # print processed_iun as JSON
                    print(json.dumps(processed_iun))
            except ValueError:
                print("Error: invalid JSON")
                sys.exit(1)
    except FileNotFoundError:
        print("Error: file not found")
        sys.exit(1)

def process_timelines_iun(iun):
    processed_iun = {
        'iun': iun['iun'],
        'notificationSentAt': iun['notificationSentAt'],
        'intervAck': None,
        'intervAar': None,
        'intervDigital': None,
    }
    return processed_iun

if __name__ == '__main__':
    main()