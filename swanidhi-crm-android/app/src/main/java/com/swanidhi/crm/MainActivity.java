package com.swanidhi.crm;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Dialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS = "swanidhi_crm";
    private static final String KEY_ONBOARDED = "onboarded";
    private static final long SPLASH_MIN_MS = 900;
    private static final long SPLASH_MAX_MS = 8000;

    private WebView webView;
    private ProgressBar progress;
    private View offline, splash, onboarding;
    private String bridgeJs;
    private boolean mainFrameError;
    private boolean splashDone;
    private boolean waitingForOnboarding;
    private long splashShownAt;
    private long lastBackPress;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebViewAssetLoader assetLoader;

    private Dialog popup;
    private WebView popupWebView;

    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileCallback == null) return;
                Uri[] uris = null;
                Intent data = result.getData();
                if (result.getResultCode() == RESULT_OK) {
                    if (data != null && data.getClipData() != null) {
                        uris = new Uri[data.getClipData().getItemCount()];
                        for (int i = 0; i < uris.length; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
                    } else if (data != null && data.getData() != null) {
                        uris = new Uri[]{data.getData()};
                    } else if (cameraUri != null) {
                        uris = new Uri[]{cameraUri};
                    }
                }
                fileCallback.onReceiveValue(uris);
                fileCallback = null;
            });

    private final ActivityResultLauncher<String[]> locationPermission = registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(), granted -> {
                boolean ok = Boolean.TRUE.equals(granted.get(Manifest.permission.ACCESS_FINE_LOCATION))
                        || Boolean.TRUE.equals(granted.get(Manifest.permission.ACCESS_COARSE_LOCATION));
                if (geoCallback != null) geoCallback.invoke(geoOrigin, ok, false);
                if (!ok) Toast.makeText(this, R.string.location_denied, Toast.LENGTH_LONG).show();
                geoCallback = null;
            });

    private final ActivityResultLauncher<String> cameraPermission = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(), granted -> launchPendingChooser(granted));
    private WebChromeClient.FileChooserParams pendingChooserParams;

    // Bundled demo CRM (assets/demo), served on a secure origin so storage, geolocation and
    // the bridge behave exactly as they do on the live site.
    static final String DEMO_HOST = WebViewAssetLoader.DEFAULT_DOMAIN;
    static final String DEMO_URL = "https://" + DEMO_HOST + "/assets/demo/index.html";

    /** Pages allowed to stay inside the app and use the native bridge. */
    static boolean isCrmUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        return "https".equals(uri.getScheme()) && host != null
                && (host.equals(BuildConfig.CRM_HOST) || host.endsWith("." + BuildConfig.CRM_HOST)
                || (BuildConfig.DEMO_MODE && host.equals(DEMO_HOST)));
    }

    private static String homeUrl() {
        return BuildConfig.DEMO_MODE ? DEMO_URL : BuildConfig.CRM_URL;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progress = findViewById(R.id.progress);
        offline = findViewById(R.id.offline);
        splash = findViewById(R.id.splash);
        onboarding = findViewById(R.id.onboarding);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .addPathHandler("/res/", new WebViewAssetLoader.ResourcesPathHandler(this))
                .build();
        applyInsets();
        setupWebView(webView);
        setupSplash(savedInstanceState != null);
        setupBackHandling();

        findViewById(R.id.btn_retry).setOnClickListener(v -> {
            mainFrameError = false;
            offline.setVisibility(View.GONE);
            if (webView.getUrl() == null || "about:blank".equals(webView.getUrl())) {
                webView.loadUrl(homeUrl());
            } else {
                webView.reload();
            }
        });

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(startUrl(getIntent()));
        }
    }

    private String startUrl(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        if (BuildConfig.DEMO_MODE) return DEMO_URL;
        return data != null && isCrmUrl(data.toString()) ? data.toString() : BuildConfig.CRM_URL;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (!BuildConfig.DEMO_MODE && data != null && isCrmUrl(data.toString())) webView.loadUrl(data.toString());
    }

    // ---------- Layout / system bars ----------

    private void applyInsets() {
        View content = findViewById(R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return insets;
        });
        ViewCompat.setOnApplyWindowInsetsListener(onboarding, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        // Splash background and waves stay full-bleed; only the brand block and button move clear of the bars.
        View splashBottom = findViewById(R.id.splash_bottom);
        int bottomPad = splashBottom.getPaddingBottom();
        ViewCompat.setOnApplyWindowInsetsListener(splash, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            View brand = findViewById(R.id.splash_brand);
            brand.setPadding(bars.left, bars.top, bars.right, brand.getPaddingBottom());
            splashBottom.setPadding(splashBottom.getPaddingLeft(), 0, splashBottom.getPaddingRight(), bottomPad + bars.bottom);
            return insets;
        });
    }

    private void setLightSystemBars(boolean light) {
        Window window = getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(light);
        controller.setAppearanceLightNavigationBars(light);
        window.setNavigationBarColor(light ? Color.WHITE : ContextCompat.getColor(this, R.color.navy_bottom));
    }

    // ---------- Splash + onboarding (Zavtoo intro flow) ----------

    private void setupSplash(boolean restoring) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (restoring) {
            splash.setVisibility(View.GONE);
            splashDone = true;
            setLightSystemBars(true);
            return;
        }
        setLightSystemBars(false);
        splashShownAt = System.currentTimeMillis();
        View brand = findViewById(R.id.splash_brand);
        brand.setAlpha(0f);
        brand.setTranslationY(24f);
        brand.animate().alpha(1f).translationY(0f).setDuration(600).start();

        if (!prefs.getBoolean(KEY_ONBOARDED, false)) {
            waitingForOnboarding = true;
            findViewById(R.id.splash_loading).setVisibility(View.GONE);
            View start = findViewById(R.id.btn_get_started);
            start.setVisibility(View.VISIBLE);
            start.setOnClickListener(v -> {
                showOnboarding();
                fadeOut(splash);
            });
        } else {
            handler.postDelayed(this::dismissSplash, SPLASH_MAX_MS);
        }
    }

    private void dismissSplash() {
        if (splashDone || waitingForOnboarding) return;
        long wait = SPLASH_MIN_MS - (System.currentTimeMillis() - splashShownAt);
        if (wait > 0) {
            handler.postDelayed(this::dismissSplash, wait);
            return;
        }
        splashDone = true;
        setLightSystemBars(true);
        fadeOut(splash);
    }

    private static void fadeOut(View v) {
        v.animate().alpha(0f).setDuration(280).withEndAction(() -> {
            v.setVisibility(View.GONE);
            v.setAlpha(1f);
        }).start();
    }

    private static final int[][] SLIDES = {
            {R.string.ob1_title, R.string.ob1_accent, R.string.ob1_body, R.drawable.ic_users, R.drawable.circle_blue_tint},
            {R.string.ob2_title, R.string.ob2_accent, R.string.ob2_body, R.drawable.ic_receipt, R.drawable.circle_gold_tint},
            {R.string.ob3_title, R.string.ob3_accent, R.string.ob3_body, R.drawable.ic_calendar, R.drawable.circle_blue_tint},
    };
    private int slide;

    private void showOnboarding() {
        setLightSystemBars(true);
        onboarding.setVisibility(View.VISIBLE);
        slide = 0;
        bindSlide(false);
        findViewById(R.id.ob_skip).setOnClickListener(v -> finishOnboarding());
        findViewById(R.id.ob_next).setOnClickListener(v -> {
            if (slide == SLIDES.length - 1) {
                finishOnboarding();
            } else {
                slide++;
                bindSlide(true);
            }
        });
    }

    private void bindSlide(boolean animate) {
        View page = findViewById(R.id.ob_page);
        Runnable bind = () -> {
            int[] s = SLIDES[slide];
            TextView title = findViewById(R.id.ob_title);
            String accent = getString(s[1]);
            String full = getString(s[0]) + "\n" + accent;
            android.text.SpannableString span = new android.text.SpannableString(full);
            span.setSpan(new android.text.style.ForegroundColorSpan(ContextCompat.getColor(this, R.color.blue)),
                    full.length() - accent.length(), full.length(), 0);
            title.setText(span);
            ((TextView) findViewById(R.id.ob_body)).setText(s[2]);
            ((ImageView) findViewById(R.id.ob_icon)).setImageResource(s[3]);
            findViewById(R.id.ob_art).setBackgroundResource(s[4]);
            ((TextView) findViewById(R.id.ob_next_label)).setText(slide == SLIDES.length - 1 ? R.string.lets_go : R.string.next);
            bindDots();
        };
        if (!animate) {
            bind.run();
            return;
        }
        page.animate().alpha(0f).translationX(-40f).setDuration(160).withEndAction(() -> {
            bind.run();
            page.setTranslationX(40f);
            page.animate().alpha(1f).translationX(0f).setDuration(220).start();
        }).start();
    }

    private void bindDots() {
        LinearLayout dots = findViewById(R.id.ob_dots);
        dots.removeAllViews();
        float dp = getResources().getDisplayMetrics().density;
        int gap = Math.round(3 * dp);
        for (int i = 0; i < SLIDES.length; i++) {
            View dot = new View(this);
            dot.setBackgroundResource(i == slide ? R.drawable.dot_active : R.drawable.dot_inactive);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    Math.round((i == slide ? 20 : 7) * dp), Math.round(7 * dp));
            lp.setMargins(gap, 0, gap, 0);
            dots.addView(dot, lp);
        }
    }

    private void finishOnboarding() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_ONBOARDED, true).apply();
        waitingForOnboarding = false;
        splashDone = true;
        fadeOut(onboarding);
    }

    // ---------- WebView ----------

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void setupWebView(WebView view) {
        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setUserAgentString(s.getUserAgentString() + " SwanidhiCRMApp/" + BuildConfig.VERSION_NAME);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(view, true);

        view.addJavascriptInterface(new WebBridge(this, view), WebBridge.NAME);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Set<String> origins = new HashSet<>();
            origins.add("https://" + BuildConfig.CRM_HOST);
            origins.add("https://www." + BuildConfig.CRM_HOST);
            if (BuildConfig.DEMO_MODE) origins.add("https://" + DEMO_HOST);
            WebViewCompat.addDocumentStartJavaScript(view, bridgeJs(), origins);
        }

        view.setWebViewClient(new CrmWebClient(view == webView));
        view.setWebChromeClient(new CrmChromeClient());
        view.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                handleDownload(view, url, userAgent, contentDisposition, mimeType));
    }

    private String bridgeJs() {
        if (bridgeJs != null) return bridgeJs;
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(getAssets().open("bridge.js"), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
        } catch (Exception ignored) {
        }
        return bridgeJs = sb.toString();
    }

    private class CrmWebClient extends WebViewClient {
        private final boolean main;

        CrmWebClient(boolean main) {
            this.main = main;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return BuildConfig.DEMO_MODE ? assetLoader.shouldInterceptRequest(request.getUrl()) : null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (isCrmUrl(url)) return false;
            openExternal(request.getUrl());
            // A popup that only existed to open an external link (e.g. wa.me) has nothing to show.
            if (!main && (view.getUrl() == null || "about:blank".equals(view.getUrl()))) closePopup();
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (main) {
                mainFrameError = false;
                progress.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT) && isCrmUrl(url)) {
                view.evaluateJavascript(bridgeJs(), null);
            }
            CookieManager.getInstance().flush();
            if (!main) return;
            progress.setVisibility(View.GONE);
            if (!mainFrameError) {
                offline.setVisibility(View.GONE);
                dismissSplash();
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!main || !request.isForMainFrame()) return;
            mainFrameError = true;
            showOffline();
        }
    }

    private class CrmChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (view == webView) {
                progress.setProgress(newProgress);
                if (newProgress >= 100) progress.setVisibility(View.GONE);
            }
        }

        @Override
        public void onReceivedTitle(WebView view, String title) {
            if (view == popupWebView && popup != null) {
                ((TextView) popup.findViewById(R.id.popup_title)).setText(title);
            }
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            pendingChooserParams = params;
            if (acceptsImages(params) && ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                cameraPermission.launch(Manifest.permission.CAMERA);
            } else {
                launchPendingChooser(true);
            }
            return true;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (!isCrmUrl(origin)) {
                callback.invoke(origin, false, false);
                return;
            }
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                callback.invoke(origin, true, false);
                return;
            }
            geoOrigin = origin;
            geoCallback = callback;
            locationPermission.launch(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION});
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            WebView child = openPopup(null);
            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(child);
            resultMsg.sendToTarget();
            return true;
        }

        @Override
        public void onCloseWindow(WebView window) {
            if (window == popupWebView) closePopup();
        }
    }

    // ---------- Popups (window.open, printable receipts) ----------

    void openHtmlPopup(String html) {
        WebView child = openPopup(getString(R.string.app_name));
        String base = BuildConfig.DEMO_MODE ? DEMO_URL : BuildConfig.CRM_URL;
        child.loadDataWithBaseURL(base, html, "text/html", "UTF-8", base);
    }

    private WebView openPopup(String title) {
        closePopup();
        popup = new Dialog(this, R.style.Theme_SwanidhiCRM_Popup);
        popup.setContentView(R.layout.dialog_popup);
        if (popup.getWindow() != null) {
            popup.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        }
        ViewCompat.setOnApplyWindowInsetsListener(popup.findViewById(R.id.popup_root), (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        ((TextView) popup.findViewById(R.id.popup_title)).setText(title);
        popup.findViewById(R.id.popup_close).setOnClickListener(v -> closePopup());
        popupWebView = new WebView(this);
        setupWebView(popupWebView);
        ((ViewGroup) popup.findViewById(R.id.popup_container)).addView(popupWebView,
                new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        popup.setOnKeyListener((d, keyCode, event) -> {
            if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.getAction() == android.view.KeyEvent.ACTION_UP) {
                if (popupWebView != null && popupWebView.canGoBack()) popupWebView.goBack();
                else closePopup();
                return true;
            }
            return false;
        });
        popup.show();
        return popupWebView;
    }

    private void closePopup() {
        if (popup != null) {
            popup.dismiss();
            popup = null;
        }
        if (popupWebView != null) {
            popupWebView.destroy();
            popupWebView = null;
        }
    }

    // ---------- External links / downloads / files ----------

    private void openExternal(Uri uri) {
        try {
            Intent intent;
            if ("intent".equals(uri.getScheme())) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
                try {
                    startActivity(intent);
                } catch (ActivityNotFoundException e) {
                    String fallback = intent.getStringExtra("browser_fallback_url");
                    if (fallback != null) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)));
                }
                return;
            }
            intent = new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, R.string.no_app_found, Toast.LENGTH_SHORT).show();
        }
    }

    private void handleDownload(WebView view, String url, String userAgent, String contentDisposition, String mimeType) {
        if (url.startsWith("blob:") || url.startsWith("data:")) {
            String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
            view.evaluateJavascript("window.__swanidhiDownload && window.__swanidhiDownload("
                    + jsString(url) + "," + jsString(url.startsWith("data:") ? name : "") + ")", null);
            return;
        }
        String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
                    .setMimeType(mimeType)
                    .addRequestHeader("User-Agent", userAgent)
                    .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url))
                    .setTitle(fileName)
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
            Toast.makeText(this, getString(R.string.downloading, fileName), Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            openExternal(Uri.parse(url));
        }
    }

    private static String jsString(String s) {
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'";
    }

    private static boolean acceptsImages(WebChromeClient.FileChooserParams params) {
        for (String type : params.getAcceptTypes()) {
            if (TextUtils.isEmpty(type) || type.startsWith("image") || type.equals("*/*")) return true;
        }
        return false;
    }

    private void launchPendingChooser(boolean cameraAllowed) {
        WebChromeClient.FileChooserParams params = pendingChooserParams;
        pendingChooserParams = null;
        if (params == null || fileCallback == null) return;
        Intent picker = params.createIntent();
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        Intent chooser = Intent.createChooser(picker, getString(R.string.choose_file));
        cameraUri = null;
        if (cameraAllowed && acceptsImages(params)) {
            try {
                File dir = new File(getCacheDir(), "camera");
                dir.mkdirs();
                File photo = File.createTempFile("photo_", ".jpg", dir);
                cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".files", photo);
                Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                        .putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
                        .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
            } catch (Exception ignored) {
                cameraUri = null;
            }
        }
        try {
            filePicker.launch(chooser);
        } catch (ActivityNotFoundException e) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
    }

    // ---------- Offline / back ----------

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void showOffline() {
        boolean online = isOnline();
        ((TextView) findViewById(R.id.offline_title)).setText(online ? R.string.error_title : R.string.offline_title);
        ((TextView) findViewById(R.id.offline_body)).setText(online ? R.string.error_body : R.string.offline_body);
        offline.setVisibility(View.VISIBLE);
        progress.setVisibility(View.GONE);
        dismissSplash();
    }

    private void setupBackHandling() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (onboarding.getVisibility() == View.VISIBLE) {
                    finishOnboarding();
                } else if (offline.getVisibility() != View.VISIBLE && webView.canGoBack()) {
                    webView.goBack();
                } else if (System.currentTimeMillis() - lastBackPress < 2000) {
                    finish();
                } else {
                    lastBackPress = System.currentTimeMillis();
                    Toast.makeText(MainActivity.this, R.string.press_back_again, Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        closePopup();
        handler.removeCallbacksAndMessages(null);
        webView.destroy();
        super.onDestroy();
    }
}
