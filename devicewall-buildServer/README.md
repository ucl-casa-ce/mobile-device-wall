# DeviceWall Build Server ⚙️ 🏗️ 🖥️ 👷‍♂️👷‍♀️ ⚙️

The build server checks github or website location to either build the mobile app with Flutter and deploy to phones on the device wall

## Trigger Build

Push Flutter App from a GitHub Repo to all the devices:

```bash
./build.js --repo [GITHUB REPO URL]
./build.js -r https://github.com/ArizArmeidi/FlutterWeather.git
```

Push Flutter App from a GitHub Repo to a single device:

```bash
./build.js --repo [GITHUB REPO URL] --device [DEVICE_ID]
./build.js -r https://github.com/ArizArmeidi/FlutterWeather.git -d abc1234
```

## Trigger App Push to devices

```bash
# Android
adb shell am start -n com.package.name/com.package.name.ActivityName

#iOS
flutter build and launch app on devices

# Web
adb shell am start -n uk.ac.ucl.casa.ce.dw-web-preview/uk.ac.ucl.casa.ce.dw-web-preview.ActivityName

brew install libimobiledevice
https://github.com/crackleware/idevice-app-runner
launch the ios web app that's already on the device
```

## Remove the Apps from the device

```bash

# Android
find . -type f  -exec grep -i "package=" {} +

#iOS
find . -type f  -exec grep -A 1 -i "CFBundleIdentifier" {} +

```
