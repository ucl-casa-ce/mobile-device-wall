# Smart Hub Stats to MQTT 📱 ->🔋 -> 📨 -> 👨‍💻👩‍💻

This application takes the USB stats service from Cambronix USB SmartHub (through a WebSocket API) and publishes the data to our MQTT Server. We use this within CE to get device and battery data on the CE Device Wall for various applications.

## Install application

```bash
npm install
npm start
```

## Create .env file

Copy the `Template.env` file, edit the variables needed and then rename the file to `.env`

## Create Auto-Start Service (Mac)

This is currently not running as a service but can be run by forever

```bash
forever start smarthub_to_mqtt.js
```

Below is work in progress

```bash

sudo chown root /Library/LaunchDaemons/uk.ac.ucl.casa.ce.usb-device-wall.plist
sudo chmod 0644 /Library/LaunchDaemons/uk.ac.ucl.casa.ce.usb-device-wall.plist
```

Run the Service

```bash
sudo launchctl load /Library/LaunchDaemons/uk.ac.ucl.casa.ce.usb-device-wall.plist
```
