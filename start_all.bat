@echo off
echo Starting IntelMeet Environment...
start "Ngrok" cmd /k "ngrok http 3001"

echo All services started!
pause