# source /Users/marcoiannaccone/dev/repos/work/PagoPA/pn-load-test/venv/bin/activate
#
# python3 ./get_test_metrics/queues_analysis.py outputs/custom_metric/simple.csv

import pandas as pd
import sys

# read filename from command-line argument (file coming from AWS must be manuall cleaned, before)
if len(sys.argv) != 2:
    print('Usage: python3 ./queues_analysis.py <source_filename>')
    sys.exit(1)

# CSV input file
csv_input_file = sys.argv[1]
# try:
#     head_rows_to_skip = int(sys.argv[2])
# except ValueError:
#     print('head_rows_to_skip must be an integer')
#     sys.exit(1)

# load csv_input_file into a pandas dataframe
try:
    pd = pd.read_csv(csv_input_file, sep=",")
except FileNotFoundError:
    print(f'File {csv_input_file} not found')
    sys.exit(1)

print(pd.head(10))

# remove first head_rows_to_skip rows
# if head_rows_to_skip > 0:
#     pd = pd.iloc[head_rows_to_skip:]
#print(pd.head(10))

# order by datetime
#pd = pd.sort_values(by="datetime")
#print(pd.head(10))

# calc the average and the median of the "e1" column
print('Average: ' + str(pd["e1"].mean()))
print('Median: ' + str(pd["e1"].median()))
print('Min: ' + str(pd["e1"].min()))
print('Max: ' + str(pd["e1"].max()))
