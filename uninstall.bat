@echo off
setlocal

:: Stop and remove the Docker Container
echo Removing container...
docker-compose down

echo Spotlight is now unisntalled / removed , the terminal closes...
timeout /t 2
exit /b 0


