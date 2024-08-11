@echo off
setlocal

:: Überprüfen, ob Docker installiert ist
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker ist nicht installiert. Installation wird gestartet...

    :: Definiere die URL des Docker-Installers und den Pfad zur temporären Datei
    set "docker_installer=https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
    set "installer_path=%TEMP%\DockerInstaller.exe"
    
    echo Lade Docker herunter...
    powershell -Command "Invoke-WebRequest '%docker_installer%' -OutFile '%installer_path%'"

    :: Überprüfe, ob der Download erfolgreich war
    if exist "%installer_path%" (
        echo Docker Installer wurde erfolgreich heruntergeladen.
        
        echo Installiere Docker...
        start /wait "%installer_path%"
        
        echo Docker wurde installiert. Bitte starten Sie das Skript neu, um fortzufahren.
        pause
        exit /b 0
    ) else (
        echo Fehler beim Herunterladen von Docker. Bitte überprüfen Sie den Download-Link und Ihre Internetverbindung.
        pause
        exit /b 1
    )
) else (
    echo Docker ist bereits installiert.
)

:: Docker Desktop starten
echo Starte Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: Warten, bis die Docker-Engine läuft
echo Warte, bis die Docker-Engine startet...
:waitloop
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker-Engine läuft noch nicht, warte...
    timeout /t 5 >nul
    goto waitloop
)
echo Docker-Engine läuft jetzt!

:: Führe die Docker-Befehle aus
echo Stoppe vorhandenen Container...
docker-compose kill

echo Entferne vorhanden Conatiner...
docker-compose down

echo Baue Container...
docker-compose build

echo Starte Container...
docker-compose up -d

echo Vorgang abgeschlossen.
pause
