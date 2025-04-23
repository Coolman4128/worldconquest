#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Building client..."
cd client
call npm install
call npm run build
cd ..

echo "Building and starting server..."
cd server
call npm install
call npm run build
call npm start

echo "Server started."