// Injected at document start into every CRM page (and printable popups).
// Bridges browser features a WebView lacks to the native app (window.SwanidhiApp):
//   - blob:/data: downloads (CSV/XLSX exports, invoice & salary-slip PDFs)
//   - window.print() and window.open('') + document.write() receipts
//   - navigator.share()
(function () {
  if (window.__swanidhiBridge || !window.SwanidhiApp) return;
  window.__swanidhiBridge = true;
  var App = window.SwanidhiApp;

  // Keep a handle on every Blob turned into a URL: pages often revoke the URL
  // straight after a.click(), before we could fetch it.
  var blobs = {};
  var createURL = URL.createObjectURL;
  URL.createObjectURL = function (obj) {
    var url = createURL.apply(URL, arguments);
    try { if (obj instanceof Blob) blobs[url] = obj; } catch (e) {}
    return url;
  };
  var revokeURL = URL.revokeObjectURL;
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { delete blobs[url]; }, 60000);
    return revokeURL.apply(URL, arguments);
  };

  function guessName(name, mime) {
    if (name) return name;
    var ext = { 'application/pdf': 'pdf', 'text/csv': 'csv', 'image/png': 'png', 'image/jpeg': 'jpg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx' }[(mime || '').split(';')[0]];
    return 'swanidhi-' + Date.now() + (ext ? '.' + ext : '');
  }

  function sendBlob(blob, name) {
    var reader = new FileReader();
    reader.onloadend = function () {
      var result = String(reader.result || '');
      App.saveFile(result.slice(result.indexOf(',') + 1), guessName(name, blob.type), blob.type || 'application/octet-stream');
    };
    reader.onerror = function () { App.saveFile('', '', ''); };
    reader.readAsDataURL(blob);
  }

  function download(href, name) {
    if (blobs[href]) return sendBlob(blobs[href], name);
    fetch(href).then(function (r) { return r.blob(); })
      .then(function (b) { sendBlob(b, name); })
      .catch(function () { App.saveFile('', '', ''); });
  }
  window.__swanidhiDownload = download;

  function isLocalDownload(a) {
    var href = a.getAttribute('href') || '';
    return /^(blob:|data:)/i.test(href) || (a.hasAttribute('download') && href.indexOf('http') !== 0);
  }

  // Programmatic downloads: a.click() on an element that may not be in the DOM.
  var anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (isLocalDownload(this)) { download(this.href, this.getAttribute('download') || ''); return; }
    return anchorClick.apply(this, arguments);
  };
  // User taps on download links (e.g. react-pdf's PDFDownloadLink).
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || !isLocalDownload(a)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    download(a.href, a.getAttribute('download') || '');
  }, true);

  window.print = function () { App.print(document.title || ''); };

  // window.open('') + document.write(html): collect the HTML and show it in a native popup.
  var nativeOpen = window.open;
  window.open = function (url, target, features) {
    if (!url || url === 'about:blank') {
      var html = '';
      var fake = {
        closed: false,
        document: {
          open: function () { html = ''; },
          write: function () { html += Array.prototype.join.call(arguments, ''); },
          writeln: function () { html += Array.prototype.join.call(arguments, '') + '\n'; },
          close: function () { App.openHtml(html); }
        },
        focus: function () {}, blur: function () {}, print: function () {},
        close: function () { fake.closed = true; }
      };
      return fake;
    }
    return nativeOpen.apply(window, arguments);
  };

  navigator.share = function (data) {
    data = data || {};
    App.share(data.title || '', data.text || '', data.url || '');
    return Promise.resolve();
  };
  navigator.canShare = function () { return true; };
})();
