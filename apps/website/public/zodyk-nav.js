(function () {
  'use strict';

  var pageCache = new Map();
  var prefetched = new Set();
  var navigating = false;

  function isLocalLink(anchor) {
    if (!anchor) return false;
    if (anchor.hasAttribute('data-no-nav')) return false;
    if (anchor.hasAttribute('download') || anchor.target === '_blank') return false;
    if (anchor.origin !== location.origin) return false;
    var path = anchor.pathname;
    if (!path.startsWith('/')) return false;
    if (path.startsWith('/assets/')) return false;
    if (anchor.hash && anchor.pathname === location.pathname) return false;
    return true;
  }

  function normalizeUrl(url) {
    return new URL(url, location.origin).pathname + new URL(url, location.origin).search;
  }

  function fetchPage(url) {
    var key = normalizeUrl(url);
    if (pageCache.has(key)) {
      return Promise.resolve(pageCache.get(key));
    }
    return fetch(url, {
      headers: { Accept: 'text/html', 'X-Zodyk-Nav': '1' },
      credentials: 'same-origin',
    }).then(function (res) {
      return res.text().then(function (html) {
        var payload = { html: html, status: res.status };
        pageCache.set(key, payload);
        return payload;
      });
    });
  }

  function prefetch(url) {
    var key = normalizeUrl(url);
    if (prefetched.has(key) || pageCache.has(key)) return;
    prefetched.add(key);
    fetchPage(url).catch(function () {
      prefetched.delete(key);
    });
  }

  function swapPage(doc) {
    var nextPage = doc.getElementById('zodyk-page');
    var currentPage = document.getElementById('zodyk-page');
    if (!nextPage || !currentPage) return false;

    document.title = doc.title;
    currentPage.replaceWith(document.importNode(nextPage, true));
    return true;
  }

  function navigate(url, options) {
    options = options || {};
    if (navigating) return Promise.resolve();
    navigating = true;
    document.body.classList.add('zodyk-navigating');

    return fetchPage(url)
      .then(function (payload) {
        var doc = new DOMParser().parseFromString(payload.html, 'text/html');
        var swapped = swapPage(doc);
        if (!swapped) {
          location.href = url;
          return;
        }

        if (options.replace) {
          history.replaceState({ zodyk: true }, '', url);
        } else {
          history.pushState({ zodyk: true }, '', url);
        }

        window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent('zodyk:navigate', { detail: { url: url } }));
      })
      .catch(function () {
        location.href = url;
      })
      .finally(function () {
        navigating = false;
        document.body.classList.remove('zodyk-navigating');
      });
  }

  function onClick(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    var anchor = event.target.closest('a[href]');
    if (!isLocalLink(anchor)) return;
    event.preventDefault();
    navigate(anchor.href);
  }

  function onMouseOver(event) {
    var anchor = event.target.closest('a[href]');
    if (isLocalLink(anchor)) prefetch(anchor.href);
  }

  function onPopState() {
    navigate(location.href, { replace: true });
  }

  function boot() {
    if (!document.getElementById('zodyk-page')) return;

    var style = document.createElement('style');
    style.textContent =
      '#zodyk-page{transition:opacity .12s ease}' +
      'body.zodyk-navigating #zodyk-page{opacity:.65}';
    document.head.appendChild(style);

    document.addEventListener('click', onClick);
    document.addEventListener('mouseover', onMouseOver, { passive: true });
    document.addEventListener('touchstart', onMouseOver, { passive: true });
    window.addEventListener('popstate', onPopState);

    if (!history.state || !history.state.zodyk) {
      history.replaceState({ zodyk: true }, '', location.href);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
