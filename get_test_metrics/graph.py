# Description: This script takes a processed-timelines.json file and outputs a graph of the validation time

# install pandas matplotlib

# python3 ./get_test_metrics/graph.py outputs/2023-06-01_19-00__5req20min_SearchGetDownloadSend-0106-1900/processed-timelines.json graph.png

import pandas as pd
import matplotlib.pyplot as plt
import sys



# read filename from command-line argument
if len(sys.argv) != 3:
    print('Usage: python3 ./graph.py <source_filename> <graph_filename>')
    sys.exit(1)

filename = sys.argv[1]

# load filename into a pandas dataframe
try:
    pd = pd.read_json(filename, orient="records")
except FileNotFoundError:
    print(f'File {filename} not found')
    sys.exit(1)

# select all columns except "timeline" and "futureActions", in the same pd
pd = pd.drop(columns=["timeline", "futureActions"])
print(pd.head())
print(pd.columns)
print(pd.dtypes)

# select only rows where validationTime is not null
pd = pd[pd["validationTime"].notnull()]
print(pd.head())

# derive a new colume "validationHourMinutes" from "validationTimeStamp" column removing the part before "T"
# and truncating the time to the minute
pd["validationHourMinutes"] = pd["validationTimeStamp"].str.split("T").str[1].str[:5]
print(pd.head())

# only keep "validationTime", "validationHourMinutes" columns
pd = pd[["validationTime", "validationHourMinutes"]]
print(pd.head())

# group by "validationHourMinutes" and average "validationTime"
pd = pd.groupby("validationHourMinutes").mean()
# order by "validationHourMinutes"
pd = pd.sort_values(by="validationHourMinutes")
# add a key column
pd = pd.reset_index()
print(pd)
print(pd.dtypes)
#pd.to_csv("outputs/2023-06-01_19-00__5req20min_SearchGetDownloadSend-0106-1900/validation-time.csv", index=False)

# plot the graph, using matplotlib, to file, with "validationHourMinutes" on the x and "validationTime" on the y
pd.plot(x="validationHourMinutes", y="validationTime", kind="line", title="Validation time")
#plt.show()
plt.savefig("outputs/2023-06-01_19-00__5req20min_SearchGetDownloadSend-0106-1900/validation-time.png")
