FROM node:20-slim

# Install ffmpeg (required for RTMP → HLS conversion)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --production

# Copy server code
COPY server.js ./

# Create media directories
RUN mkdir -p media/live media/recordings

# Expose RTMP and HTTP ports
EXPOSE 1935 8000

# Start the server
CMD ["node", "server.js"]
