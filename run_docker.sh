#!/bin/bash

# Build the Docker image
docker build -t voice-forms .

# Run the Docker container in the background
docker run -d -p 3000:3000 -p 8080:8080 --name voice-forms-container voice-forms

# After running, then launch the UI
# http://localhost:3000

# Pause for user input
read -p "Press [Enter] key to stop and remove the container..."

# Stop the Docker container
docker stop voice-forms-container

# Remove the Docker container
docker rm voice-forms-container


