@echo off
echo Starting Cloud Run deployment...
powershell -ExecutionPolicy Bypass -File update-cloudrun.ps1
pause