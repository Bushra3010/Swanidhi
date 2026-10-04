# Methods called from page JavaScript must keep their names.
-keepclassmembers class com.swanidhi.crm.WebBridge {
    @android.webkit.JavascriptInterface <methods>;
}
