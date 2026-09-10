(function () {
  "use strict";

  var COMPANY = {
    phoneDisplay: "+7 919 712-12-94",
    phoneHref: "tel:+79197121294",
    email: "gkprommet@mail.ru",
    mailHref: "mailto:gkprommet@mail.ru"
  };

  document.querySelectorAll('[data-c]').forEach(function (el) {
    var key = el.getAttribute('data-c');
    var val = COMPANY[key];
    if (val === undefined) return;
    if (el.tagName === 'A') { el.setAttribute('href', val); }
    var textKey = el.getAttribute('data-c-text');
    if (textKey && COMPANY[textKey] !== undefined) {
      el.textContent = COMPANY[textKey];
    } else if (!textKey && (key === 'phoneDisplay' || key === 'email')) {
      el.textContent = val;
    }
  });
  document.querySelectorAll('span[data-c]').forEach(function (el) {
    var key = el.getAttribute('data-c');
    if (COMPANY[key] !== undefined) el.textContent = COMPANY[key];
  });

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Highlight current page in nav ---- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.main a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === here || (here === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---- Catalog search (only present on katalog.html) ---- */
  var searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#cat-grid .cat'));
    var countEl = document.getElementById('catalog-count');
    var noResults = document.getElementById('no-results');

    function renderCount(n) {
      if (!countEl) return;
      countEl.textContent = n + (n === 1 ? ' группа' : (n >= 2 && n <= 4 ? ' группы' : ' групп'));
    }
    renderCount(cards.length);

    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var hay = (card.dataset.search || '') + ' ' + card.querySelector('h3').textContent.toLowerCase();
        var match = q === '' || hay.toLowerCase().indexOf(q) !== -1;
        card.hidden = !match;
        if (match) visible++;
      });
      renderCount(visible);
      if (noResults) noResults.hidden = visible !== 0;
    });
  }

  /* ---- Quote list (add-to-request), shared across pages ---- */
  var STORAGE_KEY = 'promet_quote_items_v1';
  var selected = [];
  try {
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(stored)) selected = stored;
  } catch (e) { selected = []; }

  var pill = document.getElementById('quote-pill');
  var pillCount = document.getElementById('quote-pill-count');
  var tagsWrap = document.getElementById('quote-tags');
  var addButtons = Array.prototype.slice.call(document.querySelectorAll('.btn-add'));

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selected)); } catch (e) { /* ignore */ }
  }

  function syncButtons() {
    addButtons.forEach(function (btn) {
      var name = btn.getAttribute('data-cat');
      var on = selected.indexOf(name) !== -1;
      btn.classList.toggle('is-added', on);
      btn.textContent = 'Загрузить заявку/спецификацию';
    });
  }

  function renderTags() {
    if (!tagsWrap) return;
    tagsWrap.innerHTML = '';
    selected.forEach(function (name) {
      var tag = document.createElement('span');
      tag.className = 'quote-tag';
      var txt = document.createElement('span');
      txt.textContent = name;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Убрать ' + name + ' из заявки');
      btn.textContent = '✕';
      btn.addEventListener('click', function () { toggle(name); });
      tag.appendChild(txt); tag.appendChild(btn);
      tagsWrap.appendChild(tag);
    });
  }

  function renderPill() {
    if (!pill || !pillCount) return;
    pill.hidden = selected.length === 0;
    pillCount.textContent = selected.length;
    document.body.classList.toggle('has-quote-pill', !pill.hidden);
  }

  function toggle(name) {
    var i = selected.indexOf(name);
    if (i === -1) selected.push(name); else selected.splice(i, 1);
    persist(); syncButtons(); renderTags(); renderPill();
  }

  function add(name) {
    if (selected.indexOf(name) === -1) selected.push(name);
    persist(); syncButtons(); renderTags(); renderPill();
  }

  addButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      add(btn.getAttribute('data-cat'));
      window.location.href = 'kontakty.html#request';
    });
  });

  syncButtons(); renderTags(); renderPill();

  /* ---- Quote form -> mailto (present on kontakty.html) ---- */
  var form = document.getElementById('quote-form');
  if (form) {
    var statusEl = document.getElementById('form-status');

    var fileInput = document.getElementById('f-file');
    var fileNameEl = document.getElementById('file-upload-name');
    if (fileInput && fileNameEl) {
      fileInput.addEventListener('change', function () {
        fileNameEl.textContent = fileInput.files.length ? fileInput.files[0].name : 'Файл не выбран';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var comment = form.comment.value.trim();
      var consent = form.consent.checked;

      if (!name || !phone) {
        statusEl.textContent = 'Укажите имя и телефон.';
        statusEl.className = 'form-status err';
        return;
      }
      if (!consent) {
        statusEl.textContent = 'Нужно согласие на обработку персональных данных.';
        statusEl.className = 'form-status err';
        return;
      }

      var lines = [
        'Имя: ' + name,
        'Телефон: ' + phone,
        'Группы крепежа: ' + (selected.length ? selected.join(', ') : 'см. комментарий'),
        'Комментарий: ' + (comment || '—')
      ];
      var subject = 'Заявка с сайта — запрос цены и наличия';
      var body = lines.join('\n');
      var href = COMPANY.mailHref + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      statusEl.textContent = 'Открываем почтовый клиент с заполненным письмом…';
      statusEl.className = 'form-status ok';
      window.location.href = href;
    });
  }

  /* ---- Cookie bar (all pages) ---- */
  var COOKIE_KEY = 'promet_cookie_ack_v1';
  var bar = document.getElementById('cookie-bar');
  if (bar) {
    /* Keep the floating quote pill above the cookie bar instead of overlapping it. */
    var syncCookieBarHeight = function () {
      var h = bar.hidden ? 0 : bar.offsetHeight;
      document.documentElement.style.setProperty('--cookie-bar-h', h + 'px');
    };
    try {
      if (!localStorage.getItem(COOKIE_KEY)) bar.hidden = false;
    } catch (e) { bar.hidden = false; }
    syncCookieBarHeight();
    window.addEventListener('resize', syncCookieBarHeight);
    var cookieOk = document.getElementById('cookie-ok');
    if (cookieOk) {
      cookieOk.addEventListener('click', function () {
        bar.hidden = true;
        syncCookieBarHeight();
        try { localStorage.setItem(COOKIE_KEY, '1'); } catch (e) { /* ignore */ }
      });
    }
  }

  /* ---- Reviews carousel (only present on otzyvy.html) ---- */
  var carousel = document.getElementById('review-carousel');
  if (carousel) {
    var pages = Array.prototype.slice.call(carousel.querySelectorAll('.review-page'));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('.review-dot'));
    var current = 0;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = null;

    function show(index) {
      current = (index + pages.length) % pages.length;
      pages.forEach(function (p, i) { p.classList.toggle('is-active', i === current); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === current);
        d.setAttribute('aria-selected', i === current ? 'true' : 'false');
      });
    }

    function startAutoplay() {
      if (reduceMotion || pages.length < 2) return;
      stopAutoplay();
      timer = setInterval(function () { show(current + 1); }, 5000);
    }
    function stopAutoplay() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { show(i); startAutoplay(); });
    });
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    startAutoplay();
  }

  /* ---- Smooth scroll for same-page anchors ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (target) {
        ev.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      }
    });
  });
})();
