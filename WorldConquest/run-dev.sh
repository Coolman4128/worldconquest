#!/bin/bash

# Build TypeScript code
echo "Building TypeScript code..."
cd client
npm run build
cd ..

# Run the .NET project
echo "Starting .NET application..."
dotnet run