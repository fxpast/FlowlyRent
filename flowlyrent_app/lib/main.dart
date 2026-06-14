import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

const String kUrl = 'https://flowlyrent.com';

const AndroidNotificationChannel _highImportanceChannel = AndroidNotificationChannel(
  'high_importance_channel',
  'Notifications importantes',
  importance: Importance.high,
);

final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(const FlowlyRentApp());
}

class FlowlyRentApp extends StatelessWidget {
  const FlowlyRentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlowlyRent',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1976D2)),
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() {
            _isLoading = true;
            _hasError = false;
          }),
          onPageFinished: (_) {
            setState(() => _isLoading = false);
            _sendFcmTokenToWebView();
          },
          onWebResourceError: (_) => setState(() {
            _isLoading = false;
            _hasError = true;
          }),
        ),
      )
      ..loadRequest(Uri.parse(kUrl));

    _initPushNotifications();
  }

  Future<void> _initPushNotifications() async {
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_highImportanceChannel);

    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
      onDidReceiveNotificationResponse: (response) {
        _navigateToPath(response.payload);
      },
    );

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification == null) return;
      _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _highImportanceChannel.id,
            _highImportanceChannel.name,
            icon: '@mipmap/ic_launcher',
          ),
        ),
        payload: message.data['url'],
      );
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _navigateToPath(message.data['url']);
    });

    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      _navigateToPath(initialMessage.data['url']);
    }

    FirebaseMessaging.instance.onTokenRefresh.listen((_) {
      _sendFcmTokenToWebView();
    });

    _sendFcmTokenToWebView();
  }

  Future<void> _sendFcmTokenToWebView() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null) return;
    await _controller.runJavaScript(
      'if (window.registerFcmToken) { window.registerFcmToken("$token"); }',
    );
  }

  void _navigateToPath(String? path) {
    if (path == null || path.isEmpty) return;
    _controller.loadRequest(Uri.parse('$kUrl$path'));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) {
          if (await _controller.canGoBack()) {
            await _controller.goBack();
          } else {
            if (context.mounted) SystemNavigator.pop();
          }
        }
      },
      child: Scaffold(
        body: Stack(
          children: [
            if (_hasError)
              _buildErrorScreen()
            else
              WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(color: Color(0xFF1976D2)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 64, color: Color(0xFF1976D2)),
            const SizedBox(height: 24),
            const Text(
              'Connexion impossible',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Vérifiez votre connexion internet\net réessayez.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: Colors.grey),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => _controller.loadRequest(Uri.parse(kUrl)),
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1976D2),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
