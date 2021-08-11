const mqtt = require('mqtt');
const WebSocket = require('ws');
const dotenv = require('dotenv').config()

if (dotenv.error) {
    throw result.error
}  

const mqttTopic = process.env.MQTT_TOPIC;
const mqttServer = "mqtt://" + process.env.MQTT_HOST + ":" +  process.env.MQTT_PORT;

const options = {
	clientId: process.env.MQTT_CLIENT_ID,
	username: process.env.MQTT_USER,
	password: process.env.MQTT_PASS,
	clean:true		    
};

var hub = {
    serial: process.env.HUB_SERIAL,
    handle: -1,
    ports: process.env.HUB_PORTS
};

const mqttClient  = mqtt.connect(mqttServer, options);
const ws = new WebSocket(process.env.HUB_WEBSOCKET, 'jsonrpc');

var lastId = 0;
var requests = {};

var updateFrequency = process.env.HUB_STATUS_UPDATE_SECS * 1000;

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.File({ filename: process.env.ERROR_LOG, level: 'error' }),
    //new transports.File({ filename: process.env.DEBUG_LOG }),
    new transports.Console({})
  ]
});

mqttClient.on('connect', function () {
    logger.info("Connected to MQTT Server ["+mqttServer+"]");
})
  
ws.on('open', function open() {
    logger.info("Connection to WebSocket Open [Cambrionix Hub: " + hub.serial + "]");

    // Connect to Hub
    makeRequest("cbrx_connection_open",[hub.serial], null, null);
});

ws.on('closed', function open() {
    logger.info("Connection to WebSocket Disconnected [Cambrionix USBHub: " + hub.serial + "]");
    requests = {};
});

ws.on('message', function incoming(data) {
    var data = JSON.parse(data);
    if(hub.handle === -1){
        // First Message is the Hub Connection
        hub.handle = data.result;
        delete requests[data.id];
        logger.info("Found Hub. Getting Port Info and Sending via MQTT [" + updateFrequency/1000 + " sec intervals]")
        logger.info("Sending to MQTT Topic [" + process.env.MQTT_TOPIC + "]")

        setInterval(() => {
            makeRequest("cbrx_connection_get", [hub.handle, "PortsInfo"], null, null);  
        }, updateFrequency);

    }else if(data.error !== undefined){
        if(!isEmpty(data.error)){
            if(data.error.code == -10005){
                logger.error("Couldn't Connect to the Hub: " + hub.serial + " Exiting .... ");
                process.exit(1);
            }
        }
    }else{
        // Subsequent Messages are the Port Info Messages
        try{
            //console.log(JSON.stringify(data, null, 4));
            //logger.info("Message Received. ");

            // Parse to MQTT
            mqtt_send(data);

            delete requests[data.id]; 
            } catch (e) {
                logger.error("Error handling packet :");
            }
        }
});

function mqtt_send(obj){
    if(obj.result != undefined){  
        var portData = obj.result;
        var length = 0;
        for(var k in portData) if(portData.hasOwnProperty(k)) length++;
        if(length == hub.ports){
            //logger.info("Parsing " + length + " ports info.");
            var keys = Object.keys( portData );

            // Breakdown each Object to publish values
            for( var i = 0,length = keys.length; i < length; i++ ) {
                clearOldValues(portData[keys[i]]);
                
                for(var attr in portData[keys[i]]){
                    if(Object.getPrototypeOf(portData[keys[i]][attr]) === Object.prototype){
                        if(attr == "USBTree"){
                            // Move into the USBTree.USB2 Object
                            publishObject(mqttTopic + '/' + keys[i] + '/' + attr, portData[keys[i]][attr]["USB2"]);
                            //logger.info("Publishing Info to topic: " + mqttTopic + '/' + keys[i] + '/' + attr, portData[keys[i]][attr]["USB2"] );

                        }else{
                            // Publish everything top level of an object
                            publishObject(mqttTopic + '/' + keys[i] + '/' + attr, portData[keys[i]][attr]);
                            //logger.info("Publishing Info to topic: " + mqttTopic + '/' + keys[i] + '/' + attr );
                        }
                    }else{                    
                        mqttClient.publish(mqttTopic + '/' + keys[i] + '/' + attr, portData[keys[i]][attr].toString());
                        //logger.info("Publishing Info to topic: " + mqttTopic + '/' + keys[i] + '/' + attr );
                    }
                } 
                // Publish the raw JSON Object for each topic
                mqttClient.publish(mqttTopic + '/' + keys[i] + '/JSON', JSON.stringify(obj.result[keys[i]]));
                //logger.info("Publishing Info to topic: " + mqttTopic + '/' + keys[i] + '/JSON');
            }
        }
    }    
}

function clearOldValues(obj){
    var clearArray = ["PhoneSerialNumber", "PhoneIdentity", "PhoneSoftwareVersion", "USBTree", "Battery", "IMEI", "USBTree"]
    clearArray.forEach(function(val){
        if(obj[val] == undefined || obj[val] == "USBTree"){
            obj[val] = "";
        }
    });
    
}

function publishObject(topic, obj){
    var keys = Object.keys( obj );
    var length = 0;
    for( var i = 0,length = keys.length; i < length; i++ ) {
        mqttClient.publish(topic + '/' + keys[i], obj[keys[i]].toString());
    }
}

const makeRequest = function (method, params, callback, callbackError) {
    var packet = {
        jsonrpc: "2.0",
        id: ++lastId,
        method: method,
        params: params
    };
    requests[packet.id] = { packet: packet, callback: callback, callbackError: callbackError };
    ws.send(JSON.stringify(packet));
};

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
