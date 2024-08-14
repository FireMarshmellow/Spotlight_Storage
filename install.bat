@echo off
setlocal

:: Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker is not installed. Install Docker Desktop, after installed execute this Installation.bat again...
    pause
) else (
    echo Docker is already installed.
)

:: Starting Docker Desktop
echo Startiing Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: Waiting, until the Docker-Engine is running
echo Wait, till Docker-Engine is running...
:waitloop
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker-Engine is not running, waiting...
    timeout /t 5 >nul
    goto waitloop
)
echo Docker-Engine is now running!

:: Start the Docker Container
echo Build container...
docker-compose build

echo Start container...
docker-compose up -d

echo Installation is complete, the terminal closes...
timeout /t 3
exit /b 0


