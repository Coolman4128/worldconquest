#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Building client..."
cd client
npm install
npm run build
cd ..

echo "Building and starting server..."
cd server
npm install
npm run build
npm start

echo "Server started."
