@echo off
setlocal

:: Überprüfen, ob Docker installiert ist
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker is not installed. Install Docker Desktop, after installed execute this Installation.bat again...
    pause
) else (
    echo Docker is already installed.
)

:: Docker Desktop starten
echo Startiing Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: Warten, bis die Docker-Engine läuft
echo Wait, till Docker-Engine started...
:waitloop
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker-Engine is not running, waiting...
    timeout /t 5 >nul
    goto waitloop
)
echo Docker-Engine is now running!

:: Führe die Docker-Befehle aus
echo Build container...
docker-compose build

echo Start container...
docker-compose up -d

echo The terminal closes.
timeout /t 5
exit /b 0


