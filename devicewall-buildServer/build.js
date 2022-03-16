#!/usr/bin/env node

const { exec } = require('child_process');
const { spawn } = require("child_process");
var gitclone = require("gitclone");
var gh = require('parse-github-url');
var mkdirp = require('mkdirp');
const { exit } = require('process');
var opts = require("nomnom").parse();

var passed_repo = opts.repo
var passed_device = opts.device
if(passed_repo == undefined){
    passed_repo = opts.r;
}
if(passed_device == undefined){
    passed_device = opts.d;
}

var iOSDevices = [];
var androidDevices = [];

// Create Default Build Folder if not created already
// Crontab to Delete Folder every night at midnight
mkdirp('/tmp/deviceWall');

async function getDevices(){
    return new Promise((resolve, reject) => {
        exec('flutter devices --machine', (error, stdout, stderr) => {
            //console.log(`stdout:\n${stdout}`);
            var devices = JSON.parse(stdout);
            //console.log(devices);
            for(var i = 0; i < devices.length; i++) {
                if(devices[i] != undefined){
                    if(devices[i].isSupported){
                        if(devices[i].targetPlatform.includes("android")){
                            androidDevices.push(devices[i])
                        }else if(devices[i].targetPlatform.includes("ios")){
                            iOSDevices.push(devices[i])
                        }
                    };
                }
            }

            var deviceList = {
                "android": androidDevices,
                "iOS": iOSDevices
            };

            resolve(deviceList);
        });
    })
}

// Checkout Git Repo
async function checkout_repo(repo){ 
    console.log();
    console.log("****************************************************")
    console.log("*              FETCHING FLUTTER REPO               *");
    console.log("****************************************************")

    return new Promise((resolve, reject) => {
        var location = "/tmp/deviceWall/" + gh(repo).name;
        console.log("Cloning Repo .... " + repo + " to " + location + "");
        gitclone(repo, { dest: location }, function(err){
            console.log();
            console.log("Getting Flutter Packages [flutter pub get] ....");
            // Run flutter pub get
            var getPackagesProcess = exec('flutter pub get', {cwd: location});

            getPackagesProcess.stdout.on('data', function(data) {
                console.log(" ... " + data); 
            });
    
            getPackagesProcess.stderr.on('data', function (data) {
                  console.log(' ... ERR: ' + data);
            });
    
            getPackagesProcess.on('exit', function (code) {
                if(code == 0){
                    status = "✅";
                    console.log("Finished Getting Flutter Packages: - " + status);
                }else{
                    status = "❌";
                    console.log("Finished Getting Flutter Packages: - " + status + " ** FAILED **");
                    process.exit(1);
                }
                resolve(location);
            });

        });
    });
}

async function flutter_builder(platform, folder){ 
    return new Promise((resolve, reject) => {
        var buildProcess = exec('flutter build ' + platform , {cwd: folder});

        buildProcess.stdout.on('data', function(data) {
            console.log("" + data); 
        });

        buildProcess.stderr.on('data', function (data) {
              console.log('' + data);
        });

        buildProcess.on('exit', function (code) {
            resolve("Finished Build: " + code);
        });
        
    });
}

async function flutter_install(deviceID, folder){ 
    return new Promise((resolve, reject) => {
        var installProcess = exec('flutter install --device-id ' + deviceID , {cwd: folder});

        installProcess.stdout.on('data', function(data) {
            //console.log(data); 
        });

        installProcess.stderr.on('data', function (data) {
              //console.log('' + data);
        });

        installProcess.on('exit', function (code) {
            if(code == 0){
                status = "✅";
                resolve("Finished Install on Device: [" + deviceID +"] - " + status);
            }else{
                status = "❌";
                resolve("Finished Install on Device: [" + deviceID +"] - " + status + " ** Failed **");
            }
        });
        
    });
}

function searchForDevice(device_string, jsonObj){
    // Search both Lists and return object
    
    var foundObj = jsonObj.android.filter(function(item) {
        return ((item.id == device_string) || (item.name == device_string));
    });

    if (foundObj == undefined){
        foundObj = jsonObj.iOS.filter(function(item) {
            return ((item.id == device_string) || (item.name == device_string));
        });
    }
      
    //console.log(foundObj);
    return foundObj;
}

if(passed_repo == undefined){
    console.log("Repo not defined (use -r or --repo).  Exiting");
    process.exit(1);
}

checkout_repo(passed_repo)
    .then(repo => { 
        console.log();
        console.log("****************************************************")
        console.log("*              BUILDING ANDROID APK                *"); 
        console.log("*           This make take a while .....           *");      
        console.log("****************************************************")
        console.log();
        return flutter_builder("apk", repo).then( output => repo);
    }).then(repo => { 
        console.log();
        console.log("****************************************************")
        console.log("*                BUILDING iOS IPA                  *");
        console.log("*           This make take a while .....           *");      
        console.log("****************************************************")

        console.log();
        return flutter_builder("ios", repo).then( output => repo);
    }).then(repo =>{
        console.log();
        console.log("****************************************************")
        console.log("*          GETTING CONNECTED DEVICES               *")
        console.log("****************************************************")
    
        return getDevices().then( devices => [repo, devices])
    })
    .then(function(devicesObj){
        var repo = devicesObj[0];
        var devices = devicesObj[1];

        console.log("Found " + devices.android.length + " Android Devices, "+ devices.iOS.length + " iOS Devices");
        console.log();

        console.log("****************************************************")
        console.log("*             DEPLOYING TO DEVICES                 *")
        console.log("****************************************************")
        console.log();

        if(passed_device == undefined){
        // Spawn Build Process for Android Devices
            console.log("Starting Android Deployment                         ");
            console.log("----------------------------------------------------")
            devices["android"].forEach(function(value, index) {
                console.log(" ... Pushing to Android Device: " + value.name + " [ID: "+value.id+", SDK: " + value.sdk + "]");
                Promise.resolve(flutter_install(value.id, repo)).then(function(output) {
                    console.log("\t" + output);
                });
            });
            
            console.log();

            // Spawn Build Process for iOS Devices
            console.log("Starting iOS Deployment                             ");
            console.log("----------------------------------------------------")
            devices["iOS"].forEach(function(value, index) {
                console.log(" ... Pushing to iOS Device: " + value.name + " [ID: "+value.id+", SDK: " + value.sdk + "]");
                Promise.resolve(flutter_install(value.id, repo)).then(function(output) {
                    console.log("\t" + output);
                });
            });

            console.log();
            console.log("Waiting for Devices to Finish Install               ");
            console.log("----------------------------------------------------")  

        }else{
            var singleDevice = searchForDevice(passed_device, devices);
            console.log("Pushing to Single Device                            ");
            console.log("----------------------------------------------------")
            if(singleDevice.length != 0){
                console.log(" ... Pushing to Single Device: " + singleDevice[0].name + " [ID: "+singleDevice[0].id+", SDK: " + singleDevice[0].sdk + "]");
                Promise.resolve(flutter_install(passed_device, repo)).then(function(output) {
                    console.log("\t" + output);
                });

                console.log();
                console.log("Waiting for Devices to Finish Install               ");
                console.log("----------------------------------------------------")  

            }else{
                console.log("Couldn't Find Device: " + passed_device + " - ❌");
            }
           
        }

    });
