# Device Wall WebSocket Server 📱 -> 🖥️ -> 📱 -> 👨‍💻👩‍💻

This server talks to each of the mobile devices and syncronises preview, load and refresh commands to each of the devices.  It also allows communication and updates from the Flutter buildServer scripts allowing users to install Flutter Applications to the wall. The server embeds the Admin Dashboard which can be accessed on the default port. 

## Install application

```bash
npm install
npm start
```

## Access Web Application

Open a browser window and navigate to 

```bash
    http://127.0.0.1:8888
```

## Create Auto-Start Service (Mac)

This is currently not running as a service but can be run by forever

```bash
forever start index.js
```