# Use the official Node.js image as the base image
FROM node

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Copy the start script to the working directory
COPY start.sh .

# Make the start script executable
RUN chmod +x start.sh

# Expose the port the app runs on
EXPOSE 3000
EXPOSE 8080

# Define the command to run the application
CMD ["./start.sh"]
