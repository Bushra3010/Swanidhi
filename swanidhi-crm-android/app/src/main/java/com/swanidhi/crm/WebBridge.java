package com.swanidhi.crm;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Exposed to CRM pages as {@code window.SwanidhiApp}; called by assets/bridge.js.
 * JavaScript calls arrive on a background thread, so everything hops to the UI thread
 * and first checks that the WebView is still showing a CRM page.
 */
public class WebBridge {
    public static final String NAME = "SwanidhiApp";

    private final MainActivity activity;
    private final WebView webView;

    WebBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    private void onTrustedPage(Runnable action) {
        activity.runOnUiThread(() -> {
            if (MainActivity.isCrmUrl(webView.getUrl())) action.run();
        });
    }

    @JavascriptInterface
    public boolean isApp() {
        return true;
    }

    @JavascriptInterface
    public void saveFile(String base64, String fileName, String mimeType) {
        onTrustedPage(() -> {
            if (TextUtils.isEmpty(base64)) {
                Toast.makeText(activity, R.string.download_failed, Toast.LENGTH_SHORT).show();
                return;
            }
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                Uri uri = writeToDownloads(bytes, sanitize(fileName), mimeType);
                Toast.makeText(activity, activity.getString(R.string.saved_to_downloads, sanitize(fileName)),
                        Toast.LENGTH_LONG).show();
                openFile(uri, mimeType);
            } catch (Exception e) {
                Toast.makeText(activity, R.string.download_failed, Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public void print(String title) {
        onTrustedPage(() -> {
            String job = TextUtils.isEmpty(title) ? activity.getString(R.string.app_name) : title;
            PrintManager pm = (PrintManager) activity.getSystemService(MainActivity.PRINT_SERVICE);
            pm.print(job, webView.createPrintDocumentAdapter(job), new PrintAttributes.Builder().build());
        });
    }

    @JavascriptInterface
    public void openHtml(String html) {
        onTrustedPage(() -> activity.openHtmlPopup(html));
    }

    @JavascriptInterface
    public void share(String title, String text, String url) {
        onTrustedPage(() -> {
            StringBuilder body = new StringBuilder();
            if (!TextUtils.isEmpty(text)) body.append(text);
            if (!TextUtils.isEmpty(url)) body.append(body.length() > 0 ? "\n" : "").append(url);
            Intent send = new Intent(Intent.ACTION_SEND)
                    .setType("text/plain")
                    .putExtra(Intent.EXTRA_SUBJECT, title)
                    .putExtra(Intent.EXTRA_TEXT, body.toString());
            activity.startActivity(Intent.createChooser(send, title));
        });
    }

    private static String sanitize(String name) {
        String clean = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return clean.isEmpty() ? "swanidhi-" + System.currentTimeMillis() : clean;
    }

    private Uri writeToDownloads(byte[] bytes, String fileName, String mimeType) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("MediaStore insert failed");
            try (OutputStream out = activity.getContentResolver().openOutputStream(uri)) {
                out.write(bytes);
            }
            return uri;
        }
        // Android 7–9: app-specific Download folder needs no storage permission.
        File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) throw new IllegalStateException("No external storage");
        dir.mkdirs();
        File file = new File(dir, fileName);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        }
        return FileProvider.getUriForFile(activity, activity.getPackageName() + ".files", file);
    }

    private void openFile(Uri uri, String mimeType) {
        Intent view = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, mimeType)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            activity.startActivity(view);
        } catch (Exception ignored) {
            // No viewer installed for this type; the file is still in Downloads.
        }
    }
}
