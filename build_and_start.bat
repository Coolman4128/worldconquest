@echo off
REM Exit immediately if a command exits with a non-zero status (approximated).
setlocal enabledelayedexpansion

echo Building client...
cd client
call npm install
if !ERRORLEVEL! neq 0 (
    echo Client npm install failed!
    exit /b !ERRORLEVEL!
)
call npm run build
if !ERRORLEVEL! neq 0 (
    echo Client build failed!
    exit /b !ERRORLEVEL!
)
cd ..

echo Building and starting server...
cd server
call npm install
if !ERRORLEVEL! neq 0 (
    echo Server npm install failed!
    exit /b !ERRORLEVEL!
)
call npm run build
if !ERRORLEVEL! neq 0 (
    echo Server build failed!
    exit /b !ERRORLEVEL!
)
call npm start
if !ERRORLEVEL! neq 0 (
    echo Server start failed!
    exit /b !ERRORLEVEL!
)

echo Server started.
endlocal