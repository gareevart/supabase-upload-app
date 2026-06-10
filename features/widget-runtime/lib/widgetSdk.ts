// Source of the SDK script injected into the sandboxed widget iframe.
// The iframe runs with sandbox="allow-scripts" (opaque origin), so the only
// channel to the host is postMessage; every call below is an RPC brokered by
// useWidgetHost and gated by the user's granted permissions.
export const WIDGET_SDK_SOURCE = `
(function () {
  var pending = {};
  var nextId = 1;
  var theme = 'light';
  var lang = 'en';
  var readyCallbacks = [];
  var initialized = false;

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.__widgetSdk !== true) return;

    if (data.type === 'init') {
      theme = data.theme || 'light';
      lang = data.lang || 'en';
      document.documentElement.setAttribute('data-theme', theme);
      initialized = true;
      var callbacks = readyCallbacks;
      readyCallbacks = [];
      callbacks.forEach(function (callback) {
        try { callback(); } catch (callbackError) { console.error(callbackError); }
      });
      return;
    }

    if (data.id && pending[data.id]) {
      var entry = pending[data.id];
      delete pending[data.id];
      if (data.error) {
        entry.reject(new Error(data.error));
      } else {
        entry.resolve(data.result);
      }
    }
  });

  function call(method, params) {
    return new Promise(function (resolve, reject) {
      var id = String(nextId++);
      pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ __widgetSdk: true, id: id, method: method, params: params || {} }, '*');
    });
  }

  window.widget = {
    get theme() { return theme; },
    get lang() { return lang; },
    onReady: function (callback) {
      if (initialized) { callback(); } else { readyCallbacks.push(callback); }
    },
    profile: {
      get: function () { return call('profile.get'); }
    },
    gallery: {
      list: function () { return call('gallery.list'); },
      upload: function (dataUrl, name) { return call('gallery.upload', { dataUrl: dataUrl, name: name }); }
    },
    camera: {
      takePhoto: function () { return call('camera.takePhoto'); }
    },
    storage: {
      get: function (key) { return call('storage.get', { key: key }); },
      set: function (key, value) { return call('storage.set', { key: key, value: value }); }
    },
    ui: {
      toast: function (text) { return call('ui.toast', { text: text }); }
    }
  };

  window.parent.postMessage({ __widgetSdk: true, type: 'sdk-ready' }, '*');
})();
`;

// Blocks network exfiltration from widget code: no fetch/XHR/websocket targets,
// images only from data/blob and our storage hosts.
export const WIDGET_CSP =
  "default-src 'none'; " +
  "script-src 'unsafe-inline'; " +
  "style-src 'unsafe-inline'; " +
  "img-src data: blob: https://storage.yandexcloud.net https://*.storage.yandexcloud.net; " +
  "media-src data: blob:; " +
  "font-src data:;";

const INJECTED_HEAD =
  `<meta http-equiv="Content-Security-Policy" content="${WIDGET_CSP}">` +
  `<script>${WIDGET_SDK_SOURCE}</script>`;

// Injects CSP + SDK at the very beginning of <head> so they apply before any widget code runs.
export const buildWidgetSrcdoc = (html: string): string => {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + INJECTED_HEAD + html.slice(insertAt);
  }

  const htmlMatch = html.match(/<html[^>]*>/i);
  if (htmlMatch && htmlMatch.index !== undefined) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return html.slice(0, insertAt) + `<head>${INJECTED_HEAD}</head>` + html.slice(insertAt);
  }

  return `<!DOCTYPE html><html><head>${INJECTED_HEAD}</head><body>${html}</body></html>`;
};
