# Description: This script takes a processed-timelines.json file and outputs a graph of the validation time

# install pandas matplotlib

# python3 ./get_test_metrics/graph.py outputs/2023-06-08_18-47__W6_11iter_30min_0806-1847/processed-timelines.json outputs/2023-06-08_18-47__W6_11iter_30min_0806-1847/graph.png

import pandas as pd
import matplotlib.pyplot as plt
import sys



# read filenames from command-line argument
if len(sys.argv) != 3:
    print('Usage: python3 ./graph.py <source_filename> <graph_filename>')
    sys.exit(1)

source_filename = sys.argv[1]
graph_filename = sys.argv[2]

# load filename into a pandas dataframe
try:
    pd = pd.read_json(source_filename, orient="records")
except FileNotFoundError:
    print(f'File {source_filename} not found')
    sys.exit(1)

# select all columns except "timeline" and "futureActions", in the same pd
pd = pd.drop(columns=["timeline", "futureActions"])
print(pd.head())
print(pd.columns)
print(pd.dtypes)

# select only rows where validationTime is not null
pd = pd[pd["validationTime"].notnull()]
print(pd.head())

# derive a new column "validationHourMinutes" from "validationTimeStamp" column removing the part before "T"
# and truncating the time to the minute
#pd["validationHourMinutes"] = pd["validationTimeStamp"].str.split("T").str[1].str[:5]
#print(pd.head())

# derive a new column "validationHourMinutes" from "validationTimeStamp" column, truncating the time to the minute,
# and replacing "T" with a space
pd["validationHourMinutes"] = pd["validationTimeStamp"].str[:16].replace("T", " ")
pd["validationHourMinutes"] = pd["validationHourMinutes"].str.replace("T", " ")
# obtain "validationHourMinutesLegend" from "validationHourMinutes" column, keeping only the time
#pd["validationHourMinutesLegend"] = pd["validationHourMinutes"].str[11:]
print(pd.head())


# only keep "validationTime", "validationHourMinutes" columns
pd = pd[["validationTime", "validationHourMinutes"]]
print(pd.head())

# group by "validationHourMinutes" and average "validationTime"
pd = pd.groupby("validationHourMinutes").count()
# rename "validationTime" to "validationCount"
pd = pd.rename(columns={"validationTime": "validationCount"})
# order by "validationHourMinutes"
pd = pd.sort_values(by="validationHourMinutes")
# add a key column
pd = pd.reset_index()
print(pd)
print(pd.dtypes)
#pd.to_csv("outputs/2023-06-01_19-00__5req20min_SearchGetDownloadSend-0106-1900/validation-time.csv", index=False)

# plot the graph, using matplotlib, to file, with "validationHourMinutes" on the x and "validationTime" on the y,
# with big dimentions
pd.plot(x="validationHourMinutes", y="validationCount", kind="line", title="Validation time", figsize=(20, 10))
#plt.show()
plt.savefig(graph_filename)

# print max validationCount
print(f'\nMax validationCount: {pd["validationCount"].max()}')
# print average validationCount
print(f'Average validationCount: {pd["validationCount"].mean()}')
# print median validationCount
print(f'Median validationCount: {pd["validationCount"].median()}')
