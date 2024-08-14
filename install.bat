@echo off
setlocal

:: Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker is not installed. Install Docker Desktop, then execute this Installation.bat again...
    pause
    exit /b 1
) else (
    echo Docker is already installed.
)

:: Attempt to find Docker Desktop executable dynamically
for /f "tokens=*" %%i in ('where /r "%ProgramFiles%" "Docker Desktop.exe" 2^>nul') do set "DOCKER_DESKTOP_PATH=%%i"

if not defined DOCKER_DESKTOP_PATH (
    echo Could not find Docker Desktop. Please start it manually.
    pause
    exit /b 1
) else (
    echo Docker Desktop found at %DOCKER_DESKTOP_PATH%
)

:: Starting Docker Desktop
echo Starting Docker Desktop...
start "" "%DOCKER_DESKTOP_PATH%"

:: Waiting until the Docker-Engine is running
echo Waiting for Docker-Engine to start...
:waitloop
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker-Engine is not running, waiting...
    timeout /t 5 >nul
    goto waitloop
)
echo Docker-Engine is now running!

:: Start the Docker Container
echo Building container...
docker-compose build

echo Starting container...
docker-compose up -d

echo Installation is complete, the terminal will close shortly...
timeout /t 3
exit /b 0
