#!/bin/sh

export NODE_EXTRA_CA_CERTS=./root-certs.pem

# Start the first process
npm run start &

# Start the second process
node server.js &

# Wait for any process to exit
while true; do
  if ! kill -0 $! 2>/dev/null; then
    break
  fi
  sleep 1
done

# Exit with status of the process that exited first
exit $?
