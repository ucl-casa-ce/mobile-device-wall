#!/bin/bash
echo "************************************************************"
echo "* Cleaning up installed apps on devices in the device wall *"
echo "************************************************************"

if [ -d "/tmp/deviceWall" ] 
then
    for dirPath in /tmp/deviceWall/* ; do
        echo ""
        echo "Searching Folder - $dirPath"
        PACKAGE_NAME=$(find $dirPath/. -type f  -exec grep -i "package=" {} + 2>&1 | head -n 1 | awk -F'package="' '{print $2}' |  rev | cut -c3- | rev)
        echo "   - Removing Android App from all devices ..... $PACKAGE_NAME"

        if [ ! -z "$PACKAGE_NAME" ]
        then
            echo "--------------------------------------------------------------"
            ./adb+.sh uninstall $PACKAGE_NAME
            echo "--------------------------------------------------------------"
        fi
        echo ""

        echo "   - Removing iOS Apps from all devices ..... $PACKAGE_NAME"
    
        echo "   - Removing Code Folder ..... $dirPath"

    done
else
    echo "Folder not found .... exiting."
fi

# Find Android Package Names and Uninstall on all device
#./adb+ uninstall com.example.FlutterWeather