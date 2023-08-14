#FROM golang:1.18-alpine as builder
FROM ubuntu:22.04 as builder
ARG DEBIAN_FRONTEND=noninteractive

#WORKDIR $GOPATH/src/go.k6.io/k6

RUN apt-get update -y; 
RUN apt-get install wget -y


# Install golang
RUN wget https://go.dev/dl/go1.18.2.linux-amd64.tar.gz
RUN rm -rf /usr/local/go && tar -C /usr/local -xzf go1.18.2.linux-amd64.tar.gz; rm go1.18.2.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install xk6
RUN /usr/local/go/bin/go install go.k6.io/xk6/cmd/xk6@v0.9.2

## build k6 with faker extension
## install faker
#RUN /root/go/bin/xk6 build v0.2.0 --output /root/go/bin/k6 --with github.com/szkiba/xk6-faker --with github.com/grafana/xk6-browser
RUN /root/go/bin/xk6 build v0.45.1 --output /root/go/bin/k6 
RUN apt-get update &&  \
    apt-get install -y ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

RUN curl -O https://s3.amazonaws.com/amazoncloudwatch-agent/debian/amd64/latest/amazon-cloudwatch-agent.deb && \
    dpkg -i -E amazon-cloudwatch-agent.deb && \
    rm -rf /tmp/*

FROM node:19-alpine
RUN apk add --no-cache ca-certificates bash jq aws-cli coreutils python3 py3-pip

RUN pip install boto3


COPY --from=builder /root/go/bin/k6 /usr/bin/k6

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /opt/aws/amazon-cloudwatch-agent /opt/aws/amazon-cloudwatch-agent
COPY codebuild/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json


COPY src /tests/src

COPY docker-entry-point.sh /tests
RUN chmod u+x /tests/docker-entry-point.sh

COPY get_test_metrics /tests/get_test_metrics 
RUN chmod u+x /tests/get_test_metrics/*.sh

WORKDIR /tests/

ENV RUN_IN_CONTAINER=true
ENV AWS_REGION=eu-south-1

ENTRYPOINT [ "/tests/docker-entry-point.sh" ]

