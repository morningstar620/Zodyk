(function () {
  'use strict';

  if (window.parent === window) return;

  var style = document.createElement('style');
  style.textContent =
    '.zodyk-section[data-section-id]{outline:2px solid transparent;outline-offset:-2px;cursor:pointer;transition:outline-color .15s}' +
    '.zodyk-section[data-section-id]:hover{outline-color:#2563eb}' +
    '.zodyk-section.zodyk-section--selected{outline-color:#2563eb!important}';
  document.head.appendChild(style);

  document.addEventListener('click', function (e) {
    var section = e.target.closest('.zodyk-section[data-section-id]');
    if (!section) return;
    e.preventDefault();
    e.stopPropagation();
    var sectionId = section.getAttribute('data-section-id');
    document.querySelectorAll('.zodyk-section--selected').forEach(function (el) {
      el.classList.remove('zodyk-section--selected');
    });
    section.classList.add('zodyk-section--selected');
    window.parent.postMessage({ type: 'zodyk:section:select', sectionId: sectionId }, '*');
  }, true);

  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href]');
    if (!anchor) return;
    if (anchor.origin !== location.origin && anchor.getAttribute('href')?.startsWith('http')) return;
    e.preventDefault();
    var href = anchor.getAttribute('href') || '/';
    var url = new URL(href, location.origin);
    window.parent.postMessage(
      { type: 'zodyk:preview:navigate', pathname: url.pathname },
      '*',
    );
  }, true);

  window.addEventListener('message', function (e) {
    if (e.data?.type === 'zodyk:section:replace') {
      var el = document.querySelector('[data-section-id="' + e.data.sectionId + '"]');
      if (el && e.data.html) {
        el.outerHTML = e.data.html;
      }
    }
    if (e.data?.type === 'zodyk:section:highlight' && e.data.sectionId) {
      document.querySelectorAll('.zodyk-section--selected').forEach(function (node) {
        node.classList.remove('zodyk-section--selected');
      });
      var target = document.querySelector('[data-section-id="' + e.data.sectionId + '"]');
      if (target) target.classList.add('zodyk-section--selected');
    }
  });
})();
