#!/usr/bin/env node
const { spawn } = require('child_process');
var pty = require('node-pty');
var express = require('express');
var app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server)

// Define the Static Folders
app.set('view engine', 'ejs')
app.use("/css", express.static(__dirname + '/views/static/css'));
app.use("/js", express.static(__dirname + '/views/static/js'));

app.get('/', function(req, res) {
  return res.render('pages/index');
})

app.get('/flutter', function(req, res) {
  return res.render('pages/flutter');
})

var client_list = {};

io.on('connection', function (client) {

  console.log('Client has Connected ...', client.id);

  client.on('message', function (data) {
    console.log(data);
    io.emit('message', data);
  });

  client.on('connect', function () {
    console.log('Client Added');
    console.log(JSON.stringify(client_list, null, 4));
  });

  client.on('registerDevice', function(data){
    console.log('Client Registered');
    addDevice({"id": client.id, "data": JSON.parse(data) });
  });

  client.on('disconnect', function () {
    console.log('Client has Disconnected ...', client.id)
    removeDevice(client.id);
    console.log(JSON.stringify(client_list, null, 4));
  });

  client.on('error', function (err) {
    console.log('Received an error from a client:', client.id);
    console.log(err);
  });

  client.on('refresh_wall', function (data) {
    console.log('Received an Refresh Wall from a client:', client.id);
    io.emit('refresh-all', data);
  });

  client.on('load-page-on-wall', function (data) {
    console.log('Received an Load Event:', client.id);
    console.log("\t - " + data);
    io.emit('load-page', data);
  });

  client.on('error', function (err) {
    console.log('Received an error from a client:', client.id);
    console.log(err);
  });

  client.on('getDevices', function (data) {
    //console.log('Received an Get Devices from a client:', client.id);
    io.emit('deviceList', JSON.stringify(client_list));
  });

  client.on("runFlutterInstall", function (github_url) {
    console.log(github_url);
    executeFlutterAppInstall(github_url);
  });

})

function executeFlutterAppInstall(github_url) {
  console.dir(github_url);

  var ptyProcess = pty.spawn(__dirname + "/../../devicewall-buildServer/build.js", ['-r', github_url], {
    name: 'xterm-color',
    cols: 140,
    rows: 30
  });

  console.log("Running Process ......");

  ptyProcess.on('data', function(data) {
    io.emit("processLog", {data: data});
    console.log("Calling processLog ......");
  });
  
}

function addDevice(device) {
  client_list[device.id] = device;
}

function removeDevice(deviceID) {
  delete client_list[deviceID];
}

var server_port = process.env.PORT || 8888;
server.listen(server_port, function (err) {
  if (err) throw err
  console.log('Listening on port %d', server_port);
});