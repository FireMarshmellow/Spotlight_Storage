@echo off
setlocal

:: Überprüfen, ob Docker installiert ist
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker is not installed. Installation is strating now...

    :: Definiere die URL des Docker-Installers und den Pfad zur temporären Datei
    set "docker_installer=https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
    set "installer_path=%TEMP%\DockerInstaller.exe"
    
    echo Downloading Docker...
    powershell -Command "Invoke-WebRequest '%docker_installer%' -OutFile '%installer_path%'"

    :: Überprüfe, ob der Download erfolgreich war
    if exist "%installer_path%" (
        echo Docker installer got downloaded successfully.
        
        echo Installing Docker...
        start /wait "%installer_path%"
        
        echo Docker got installed. Please start the skript again, to go ahed.
        pause
        exit /b 0
    ) else (
        echo Failed download of Docker Desktop. Please check the download-link and your internet-connection.
        pause
        exit /b 1
    )
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

:: Timer und Benutzerabfrage
set "timeout_seconds=10"
set "viewlogs="

:: Starte einen separaten Prozess für den Timer
echo Do you want to see the Log-Output of the container? (y/n): 
(for /L %%i in (%timeout_seconds%,-1,0) do (
    timeout /t 1 >nul
    if not defined viewlogs (
        echo Remaining time: %%i seconds...
    )
)) & (set /p viewlogs="> " & if defined viewlogs goto :processInput)

:: Automatisches Schließen nach Timeout
if not defined viewlogs (
    echo No input. The terminal closes.
    exit /b 0
)

:processInput
if /i "%viewlogs%"=="y" (
    echo Zeige Logs an...
    docker-compose logs
    echo Install is done.
    pause
) else (
    echo The terminal closes.
)

exit /b 0