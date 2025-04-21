@echo off
echo Building TypeScript code...
cd client
call npm run build
cd ..

echo Starting .NET application...
dotnet run