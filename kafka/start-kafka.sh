#!/bin/bash
# Start Kafka in the background
/etc/confluent/docker/run &

# Function to create a topic if it doesn't exist
create_topic_if_not_exists() {
    local topic=$1
    if ! kafka-topics --bootstrap-server localhost:9092 --list | grep -q "^${topic}$"; then
        echo "Creating topic: ${topic}"
        kafka-topics --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic "${topic}"
    else
        echo "Topic ${topic} already exists"
    fi
}

# Wait for Kafka to be up
echo "Waiting for Kafka to be up..."
while ! kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1; do
  sleep 1
done

# Create topics if they don't exist
create_topic_if_not_exists "test-healthcheck"
create_topic_if_not_exists "eventData"
create_topic_if_not_exists "notification"

wait