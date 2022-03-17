import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'slidingAppBar.dart';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:device_info_plus/device_info_plus.dart';

void main() => runApp(MaterialApp(
      home: WebPreview(),
      debugShowCheckedModeBanner: false,
    ));

const String kInitialWebPage = "https://flutter.dev";

IO.Socket socket = IO.io('http://127.0.0.1:8888', <String, dynamic>{
  'transports': ['websocket'],
  'autoConnect': false,
});

class WebPreview extends StatefulWidget {
  @override
  _WebPreviewState createState() => _WebPreviewState();
}

class _WebPreviewState extends State<WebPreview>
    with SingleTickerProviderStateMixin {
  bool _visible = true;
  late final AnimationController _aniController;

  final Completer<WebViewController> _controller =
      Completer<WebViewController>();

  var _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();

    _aniController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 400),
    );

    if (Platform.isAndroid) {
      WebView.platform = SurfaceAndroidWebView();
    }
    connectToServer();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: Colors.white,
      // floatingActionButton: FloatingActionButton.extended(
      //   label: Text(_visible ? 'Hide' : 'Show'),
      //   onPressed: () {
      //     setState(() {
      //       _visible = !_visible;
      //     });
      //   },
      // ),
      appBar: SlidingAppBar(
        controller: _aniController,
        visible: _visible,
        child: AppBar(
          title: const Text('Web Preview'),
          actions: <Widget>[
            NavigationControls(_controller.future),
            SampleMenu(_controller.future),
          ],
        ),
      ),
      body: Builder(builder: (BuildContext context) {
        return WebView(
          initialUrl: kInitialWebPage,
          javascriptMode: JavascriptMode.unrestricted,
          onWebViewCreated: (WebViewController webViewController) {
            _controller.complete(webViewController);
          },
          onProgress: (int progress) {
            print('WebView is loading (progress : $progress%)');
          },
          javascriptChannels: <JavascriptChannel>{
            _toasterJavascriptChannel(context),
          },
          navigationDelegate: (NavigationRequest request) {
            //if (request.url.startsWith('https://www.youtube.com/')) {
            // print('blocking navigation to $request}');
            // return NavigationDecision.prevent;
            //}
            print('allowing navigation to $request');
            return NavigationDecision.navigate;
          },
          onPageStarted: (String url) {
            print('Page started loading: $url');
          },
          onPageFinished: (String url) {
            print('Page finished loading: $url');
          },
          gestureNavigationEnabled: true,
          backgroundColor: const Color(0x00000000),
        );
      }),
    );
  }

  JavascriptChannel _toasterJavascriptChannel(BuildContext context) {
    return JavascriptChannel(
        name: 'Toaster',
        onMessageReceived: (JavascriptMessage message) {
          // ignore: deprecated_member_use
          Scaffold.of(context).showSnackBar(
            SnackBar(content: Text(message.message)),
          );
        });
  }

  void connectToServer() {
    try {
      // Connect to websocket
      socket.connect();

      // Handle socket events
      socket.on('connect', (_) async {
        print('Connected: ${socket.id} on ${socket.io.uri}');
        final deviceInfoPlugin = DeviceInfoPlugin();
        final deviceInfo = await deviceInfoPlugin.deviceInfo;
        final map = deviceInfo.toMap();

        String deviceInfoString = json.encode(map);
        socket.emit("registerDevice", deviceInfoString);
      });

      socket.on('disconnect',
          (_) => print('Disconnected: ${socket.id} on ${socket.io.uri}'));

      socket.on("refresh-all", (_) {
        print("Refreshing Page on Device");
        _controller.future.then((controller) async {
          controller.reload();
          await controller
              .runJavascript('Toaster.postMessage("Page Refreshed");');
        });
      });

      socket.on("load-page", (dynamic data) async {
        print("Loading Page on Device");
        print("Message Data: $data");

        Map<String, dynamic> map = jsonDecode(data);

        String url = map['wall-url'];

        url.contains(':/') ? print(url) : url = "http://" + url;

        _controller.future.then((controller) async {
          await controller.loadUrl(url);
        });
      });
    } catch (e) {
      print(e.toString());
    }
  }
}

enum MenuOptions {
  showUserAgent,
  listCookies,
  clearCookies,
  listCache,
  clearCache,
}

class SampleMenu extends StatelessWidget {
  SampleMenu(this.controller);

  final Future<WebViewController> controller;
  final CookieManager cookieManager = CookieManager();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<WebViewController>(
      future: controller,
      builder:
          (BuildContext context, AsyncSnapshot<WebViewController> controller) {
        return PopupMenuButton<MenuOptions>(
          key: const ValueKey<String>('ShowPopupMenu'),
          onSelected: (MenuOptions value) {
            switch (value) {
              case MenuOptions.showUserAgent:
                _onShowUserAgent(controller.data!, context);
                break;
              case MenuOptions.listCookies:
                _onListCookies(controller.data!, context);
                break;
              case MenuOptions.clearCookies:
                _onClearCookies(context);
                break;
              case MenuOptions.listCache:
                _onListCache(controller.data!, context);
                break;
              case MenuOptions.clearCache:
                _onClearCache(controller.data!, context);
                break;
            }
          },
          itemBuilder: (BuildContext context) => <PopupMenuItem<MenuOptions>>[
            PopupMenuItem<MenuOptions>(
              value: MenuOptions.showUserAgent,
              child: const Text('Show user agent'),
              enabled: controller.hasData,
            ),
            const PopupMenuItem<MenuOptions>(
              value: MenuOptions.listCookies,
              child: Text('List cookies'),
            ),
            const PopupMenuItem<MenuOptions>(
              value: MenuOptions.clearCookies,
              child: Text('Clear cookies'),
            ),
            const PopupMenuItem<MenuOptions>(
              value: MenuOptions.listCache,
              child: Text('List cache'),
            ),
            const PopupMenuItem<MenuOptions>(
              value: MenuOptions.clearCache,
              child: Text('Clear cache'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _onShowUserAgent(
      WebViewController controller, BuildContext context) async {
    // Send a message with the user agent string to the Toaster JavaScript channel we registered
    // with the WebView.
    await controller.runJavascript(
        'Toaster.postMessage("User Agent: " + navigator.userAgent);');
  }

  Future<void> _onListCookies(
      WebViewController controller, BuildContext context) async {
    final String cookies =
        await controller.runJavascriptReturningResult('document.cookie');
    // ignore: deprecated_member_use
    Scaffold.of(context).showSnackBar(SnackBar(
      content: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Text('Cookies:'),
          _getCookieList(cookies),
        ],
      ),
    ));
  }

  Future<void> _onListCache(
      WebViewController controller, BuildContext context) async {
    await controller.runJavascript('caches.keys()'
        '.then((cacheKeys) => JSON.stringify({"cacheKeys" : cacheKeys, "localStorage" : localStorage}))'
        '.then((caches) => Toaster.postMessage(caches))');
  }

  Future<void> _onClearCache(
      WebViewController controller, BuildContext context) async {
    await controller.clearCache();
    // ignore: deprecated_member_use
    Scaffold.of(context).showSnackBar(const SnackBar(
      content: Text('Cache cleared.'),
    ));
  }

  Future<void> _onClearCookies(BuildContext context) async {
    final bool hadCookies = await cookieManager.clearCookies();
    String message = 'There were cookies. Now, they are gone!';
    if (!hadCookies) {
      message = 'There are no cookies.';
    }
    // ignore: deprecated_member_use
    Scaffold.of(context).showSnackBar(SnackBar(
      content: Text(message),
    ));
  }

  Future<void> _onLoadFlutterAssetExample(
      WebViewController controller, BuildContext context) async {
    await controller.loadFlutterAsset('assets/www/index.html');
  }

  Widget _getCookieList(String cookies) {
    if (cookies == null || cookies == '""') {
      return Container();
    }
    final List<String> cookieList = cookies.split(';');
    final Iterable<Text> cookieWidgets =
        cookieList.map((String cookie) => Text(cookie));
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: cookieWidgets.toList(),
    );
  }
}

class NavigationControls extends StatelessWidget {
  const NavigationControls(this._webViewControllerFuture)
      : assert(_webViewControllerFuture != null);

  final Future<WebViewController> _webViewControllerFuture;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<WebViewController>(
      future: _webViewControllerFuture,
      builder:
          (BuildContext context, AsyncSnapshot<WebViewController> snapshot) {
        final bool webViewReady =
            snapshot.connectionState == ConnectionState.done;
        final WebViewController? controller = snapshot.data;
        return Row(
          children: <Widget>[
            IconButton(
              icon: const Icon(Icons.arrow_back_ios),
              onPressed: !webViewReady
                  ? null
                  : () async {
                      if (await controller!.canGoBack()) {
                        await controller.goBack();
                      } else {
                        // ignore: deprecated_member_use
                        Scaffold.of(context).showSnackBar(
                          const SnackBar(content: Text('No back history item')),
                        );
                        return;
                      }
                    },
            ),
            IconButton(
              icon: const Icon(Icons.arrow_forward_ios),
              onPressed: !webViewReady
                  ? null
                  : () async {
                      if (await controller!.canGoForward()) {
                        await controller.goForward();
                      } else {
                        // ignore: deprecated_member_use
                        Scaffold.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('No forward history item')),
                        );
                        return;
                      }
                    },
            ),
            IconButton(
              icon: const Icon(Icons.replay),
              onPressed: !webViewReady
                  ? null
                  : () {
                      controller!.reload();
                    },
            ),
          ],
        );
      },
    );
  }
}
