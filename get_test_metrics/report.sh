#!/bin/bash

# primo argomento: file sorgente, secondo argomento directory di output
n_args=$#
if [ $n_args -lt 2 ]; then
echo "No argument is given"
exit 1
fi
source_file=$1
output_dir=$2
echo "source: $1 output: $2"
mkdir -p $output_dir
grep '"statusCode":"2.*"' $1 > $2/2xx.json
grep '"statusCode":"5.*"' $1 > $2/5xx.json
grep '"statusCode":"500"' $1 > $2/500.json
grep '"statusCode":"409"' $1 > $2/409.json
grep '"statusCode":"4.*"' $1 > $2/4xx.json
echo "total_req;2xx;5xx;500;4xx;409" > $2/report.csv
total_row=$(cat $1 | wc -l)
total_2xx=$(cat $2/2xx.json | wc -l)
total_5xx=$(cat $2/5xx.json | wc -l)
total_500=$(cat $2/500.json | wc -l)
total_4xx=$(cat $2/4xx.json | wc -l)
total_409=$(cat $2/409.json | wc -l)
echo "${total_row//[[:blank:]]/};${total_2xx//[[:blank:]]/};${total_5xx//[[:blank:]]/};${total_500//[[:blank:]]/};${total_4xx//[[:blank:]]/};${total_409//[[:blank:]]/}" >> $2/report.csv