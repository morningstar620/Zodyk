(function () {
  'use strict';

  if (window.parent === window) return;

  var scrollX = 0;
  var scrollY = 0;
  var inspectorEnabled = true;

  var style = document.createElement('style');
  style.textContent =
    '.zodyk-section[data-section-id],.zodyk-block[data-block-id]{outline:2px solid transparent;outline-offset:-2px;transition:outline-color .15s}' +
    'html.zodyk-inspector-on .zodyk-section[data-section-id]:hover,html.zodyk-inspector-on .zodyk-block[data-block-id]:hover{outline-color:#2563eb}' +
    '.zodyk-section.zodyk-section--selected,.zodyk-block.zodyk-block--selected{outline-color:#2563eb!important}' +
    'html.zodyk-inspector-on .zodyk-section.zodyk-section--hover,html.zodyk-inspector-on .zodyk-block.zodyk-block--hover{outline-color:#93c5fd!important}' +
    'html.zodyk-inspector-on .zodyk-section[data-section-id],html.zodyk-inspector-on .zodyk-block[data-block-id]{cursor:pointer}' +
    '.zodyk-section-label{position:absolute;top:0;left:0;z-index:9999;background:#2563eb;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:2px 8px;border-radius:0 0 4px 0;pointer-events:none}';
  document.head.appendChild(style);

  var labelEl = document.createElement('div');
  labelEl.className = 'zodyk-section-label';
  labelEl.style.display = 'none';

  function applyInspectorMode() {
    document.documentElement.classList.toggle('zodyk-inspector-on', inspectorEnabled);
    document.documentElement.classList.toggle('zodyk-inspector-off', !inspectorEnabled);
    if (!inspectorEnabled) {
      clearSelection();
      clearHover();
    }
  }

  applyInspectorMode();

  function clearSelection() {
    document.querySelectorAll('.zodyk-section--selected,.zodyk-block--selected').forEach(function (el) {
      el.classList.remove('zodyk-section--selected', 'zodyk-block--selected');
    });
    labelEl.style.display = 'none';
  }

  function clearHover() {
    document.querySelectorAll('.zodyk-section--hover,.zodyk-block--hover').forEach(function (el) {
      el.classList.remove('zodyk-section--hover', 'zodyk-block--hover');
    });
  }

  function selectElement(el, sectionId, blockId) {
    clearSelection();
    el.classList.add(blockId ? 'zodyk-block--selected' : 'zodyk-section--selected');
    var section = el.closest('.zodyk-section[data-section-id]') || el;
    var name = el.getAttribute('data-block-id') ? 'Block' : section.getAttribute('data-section-type') || 'Section';
    labelEl.textContent = name;
    labelEl.style.display = 'block';
    if (section.style.position !== 'absolute' && section.style.position !== 'fixed') {
      section.style.position = 'relative';
    }
    section.appendChild(labelEl);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    window.parent.postMessage({ type: 'zodyk:section:select', sectionId: sectionId, blockId: blockId || undefined }, '*');
  }

  document.addEventListener('click', function (e) {
    if (!inspectorEnabled) return;

    var block = e.target.closest('.zodyk-block[data-block-id]');
    if (block) {
      e.preventDefault();
      e.stopPropagation();
      selectElement(block, block.getAttribute('data-section-id'), block.getAttribute('data-block-id'));
      return;
    }
    var section = e.target.closest('.zodyk-section[data-section-id]');
    if (!section) return;
    e.preventDefault();
    e.stopPropagation();
    selectElement(section, section.getAttribute('data-section-id'));
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
    if (e.data?.type === 'zodyk:inspector:set') {
      inspectorEnabled = Boolean(e.data.enabled);
      applyInspectorMode();
    }
    if (e.data?.type === 'zodyk:section:replace') {
      scrollX = window.scrollX;
      scrollY = window.scrollY;
      var el = document.querySelector('[data-section-id="' + e.data.sectionId + '"]');
      if (el && e.data.html) {
        el.outerHTML = e.data.html;
        window.scrollTo(scrollX, scrollY);
      }
    }
    if (e.data?.type === 'zodyk:section:highlight') {
      clearSelection();
      var target;
      if (e.data.blockId) {
        target = document.querySelector('[data-block-id="' + e.data.blockId + '"]');
      } else {
        target = document.querySelector('[data-section-id="' + e.data.sectionId + '"]');
      }
      if (target) {
        target.classList.add(e.data.blockId ? 'zodyk-block--selected' : 'zodyk-section--selected');
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
    if (e.data?.type === 'zodyk:section:hover') {
      if (!inspectorEnabled) return;
      clearHover();
      var hoverEl;
      if (e.data.blockId) {
        hoverEl = document.querySelector('[data-block-id="' + e.data.blockId + '"]');
      } else {
        hoverEl = document.querySelector('[data-section-id="' + e.data.sectionId + '"]');
      }
      if (hoverEl) hoverEl.classList.add(e.data.blockId ? 'zodyk-block--hover' : 'zodyk-section--hover');
    }
    if (e.data?.type === 'zodyk:section:unhover') {
      clearHover();
    }
    if (e.data?.type === 'zodyk:settings:update') {
      var styleEl = document.getElementById('zodyk-live-settings');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'zodyk-live-settings';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = typeof e.data.customCss === 'string' ? e.data.customCss : '';
    }
  });
})();
