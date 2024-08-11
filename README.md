# MIMOSA - short for "Mellow_Labs Inventory Management and Organization System Apparatus". Just like a refreshing mimosa, this system will make your life brighter and more organized!
   ![mimosa populated](https://github.com/user-attachments/assets/808e5831-a5d5-4d3f-99bb-9632f102a4c2)


## MIMOSA is from [Mellow Labs](https://github.com/FireMarshmellow/M.I.M.O.S.A)
On this repo you get a ready to install on windows docker container for the MIMOSA storage system. 
Setup time is less then 10 minutes even for beginner users.

With this you can use any WS2812 or other led's that run [WLED](https://kno.wled.ge/) 

## $${\color{red}Disclaimer}$$
There are known issues, relating the database and pictures of parts! You do not lose storage locations or part data like e.g. name, quantity, tags or storage location. The only thing that will be missing are the pictures. That only applys to pictures that are added via the `add from file` button, if you use the `Item image URL` and paste a link to the picture from amazon or other webseites, you will not have these issues.

It's not a bug, it's a feature XD

## Videos
The videos are not up to date and the content in them do not match the current MIMOSA version. But they are a good starting point to see it working and how to setup the esp and ws2812 leds.
##
[Main video](https://youtu.be/7C4i-2IqSS4)

[Step by step video](https://youtu.be/QOd1apc0Lpo)

## Hardware i used

[ESP32-C3](https://www.amazon.de/Waveshare-Development-ESP32-S3FH4R2-Castellated-Applications/dp/B0CHYHGYRH/ref=sr_1_3?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=3HT19BBR039GT&dib=eyJ2IjoiMSJ9.yV2RTYatG7l54mT4TmFs41gUutfrpBPcC-gNcJjW5yrX18ynT5ARl4Q363-yduVYFbXaiIDiG0O_OKJwcpUODORDJywTWMIIUHu_6GFNiXwqHgM4ZCQqe2FDi0h_BT4InKffRyJEq28FkhdjnfdLetRaF4Uk4hTL-Brc5Qjb8kmWcPcPNoRb4uG-FDWQU1Nj3aow_Y54AF_bpCq7385eE0SDKwWei3MRFSzsHGJvdIg.XqcFwKVecXx0t8aSXZ8k-3qn2ApPvE-6qe_Vg8m5CO4&dib_tag=se&keywords=esp32-s3+mini&qid=1723273994&sprefix=esp32-s3+mini%2Caps%2C92&sr=8-3)

[LEDs](https://www.amazon.de/BTF-LIGHTING-Individuell-adressierbar-Vollfarbiger-DIY-Projekte/dp/B088BPGMXB/ref=sr_1_1_sspa?dib=eyJ2IjoiMSJ9.PnDQdOUPg0UohlqZWxHQ8xYtwlm0N3cqEYbM29-REkcFFp9UB1Dpmwter90G4I3xpW5k3PxKchdsn5po5skd0NmraUfUk1Z0m6hhIzBw8DHe135MoTHnt8yXO20BuzfVKimMGoHR81c-6jKIZwOG8GXNTYY077dAJ_CyzHpVEKXWE1WTF9WiD2xEmnyKsdQoKSUqKqMxmGJsM9DwHy0iucC5qQfnJrEKCsChlFBLzvCyiBcP6sdf3W7pgMddlRcIAkP-XPp3WV2RBak6UxZTPv49qdQzKoJFiCnQfBfhBgY.qLxtFwyIAQ7sA-UBBsXBx2MR-kBGaU0054Z07bD3TGg&dib_tag=se&keywords=Ws2812b+Led+Strip&qid=1723274094&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1)

## Features
- inventory management
- search
- locate items
- sort items in groups
- set up multible storage locations

## Install WLED on ESP devices
1. Go to WLED [installation page ](https://install.wled.me/) and select the latest release and intall it on the esp device.
2. Put in your wifi data.
3. Go to the ip address of your esp, to `Config -> LED Preferences` and set up your led's like in the video.
4. Make note of the esp ip address, you will need it later to put into your MIMOSA settings.

## Installation of MIMOSA on Windows with `Installation.bat` file

1. Download this Repo as zip and extract it to the location you want to install MIMOSA on your pc. (you can put it anywhere you want e.g. Downloads,Documents,Desktop,C it doesn's matter)
   ![donload zip github](https://github.com/user-attachments/assets/47ef9d2a-582a-4f66-917a-0f451adf84f9)!
   ![Mimosa folder after unzipp](https://github.com/user-attachments/assets/a7e05c8f-946a-41c4-bbef-ea4c81498563)
   I have put it in `E:\vscode\M.I.M.O.S.A` for example. (but that depends on your system)
2. Install and start the Docker Desktop https://www.docker.com/products/docker-desktop/
3. Docker Desktop must be startet at least once befor, to set it up for the next step.
4. In the location where you have put the  MIMOSA folder, open that folder, then doubble click on the file `Installation.bat` and let the magic happen.
5. Now if everything is correct, it will start a terminal, open Docker Desktop when it is not running, build the mimosa container and start it.
6. In the treminal window you will get a massage, if you would like to see the output if yes just answer the question and it will show the logs.
7. Else if you can just wait until the terminal closes and got to the browser and input `localhost:5000`
8. That's it, you can now enjoy the easy life with mimosa.

1. Make a doubble click

## Installation of MIMOSA on Windows if the Installation.bat file does not work

1. Download this Repo as zip and extract it to the location you want to install MIMOSA on your pc. (you can put it anywhere you want e.g. Downloads,Documents,Desktop,C it doesn's matter)
   ![donload zip github](https://github.com/user-attachments/assets/47ef9d2a-582a-4f66-917a-0f451adf84f9)!
   ![Mimosa folder after unzipp](https://github.com/user-attachments/assets/a7e05c8f-946a-41c4-bbef-ea4c81498563)
   I have put it in `E:\vscode\M.I.M.O.S.A` for example. (but that depends on your system)
2. Install and start the Docker Desktop https://www.docker.com/products/docker-desktop/
3. In the location where you want to use MIMOSA, open the extracted folder of MIMOSA, then hit `strg/shift/right click` and select `open PowerShell-Window here`
   ![powershell select](https://github.com/user-attachments/assets/66188723-ffff-4910-a862-29863df3f640)
4. In the open PowerShell window you type: `docker-compse build` (it should start building, around 10 second)
   ![build docker](https://github.com/user-attachments/assets/0622968d-b39f-4a23-a99b-a59b3441d6de)
5. After the build is done, you type in: `docker-compose up -d` (starts the docker conatiner in detached mode)
   ![up docker](https://github.com/user-attachments/assets/f34ef8ff-b41a-485e-9e8d-eec69348b985)
6. Then type in: `docker-compose logs` to get the log output, there you can find your local ip address to access the MIMOSA in the browser or just input `localhost:5000`
   ![get local port](https://github.com/user-attachments/assets/9bf589b8-c152-4778-adf1-c8e45cbf42b8)
7. To get access to MIMOSA over other browsers in your network e.g. with your smartphone you need to type in the PowerShell window: `ipconfig` and find the ip     address of your computer, mine is for example 192.168.1.20 behind the ip adress you need to put in the port 5000 and this is what you put into the browser   `http://yourcomputerip:5000`
   ![mimosa in browser](https://github.com/user-attachments/assets/5d614a07-920a-45f3-8333-f8934ed3a110)
8. Input the address in any browser and thats it, your MIMOSA Storage is running and you can start adding parts.

## dependencies:

- python 3.6
