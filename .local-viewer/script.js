/* ============================================
   Compassion Course Online — Unified JavaScript
   ============================================

   SHARED FILE — edits here apply to EVERY page automatically
   (index, admin, and every week_N.html) because they all
   <script src="script.js"></script>.

   Use this file for any site-wide behavior fix (auth gate,
   dark mode, narrate buttons, accordions, etc.) so you don't
   have to touch each week page individually. Per-page HTML
   (titles, footer year, literal button text, etc.) does NOT
   propagate — those need to be updated in each HTML file, or
   better, in a shared week-template file that new weeks copy from.
   ============================================ */

// ---- Multi-Tier Password Gate ----
// Three access tiers, all client-side (SHA-256 hash compare):
//   1. Admin     — sees every week, including unreleased ones
//   2. Course    — sees every week whose releaseDate has passed
//   3. Per-week  — sees one specific week, regardless of release date
//
// Config sources (assembled by build.sh into auth-config.js):
//   - adminHash, courseHash    : from Netlify env vars (SITE_PASSWORD_HASH, SITE_COURSE_HASH)
//   - weeks[N].releaseDate     : from weeks-config.json (committed)
//   - weeks[N].passwordHash    : from weeks-config.json (committed)
//
// Auth flows:
//   - Type password into gate → SHA-256 → match against any tier → save to localStorage
//   - Visit URL with ?key=<password> → same flow, then strip key from URL
//   - Subsequent visits read stored hash from localStorage; if it no longer matches
//     the configured hash (e.g. password rotated), it's auto-cleared.
(function () {
  'use strict';

  var cfg = window.__AUTH_CONFIG__ || {};
  var ADMIN_HASH  = (cfg.adminHash  || '').trim();
  var COURSE_HASH = (cfg.courseHash || '').trim();
  var WEEKS       = cfg.weeks || {};

  // If nothing is configured anywhere, site is fully open.
  var anyHashSet = ADMIN_HASH || COURSE_HASH ||
    Object.keys(WEEKS).some(function (k) { return WEEKS[k] && WEEKS[k].passwordHash; });
  if (!anyHashSet) return;

  var LS_ADMIN  = 'cco-auth-admin';
  var LS_COURSE = 'cco-auth-course';
  var LS_WEEKS  = 'cco-auth-weeks';

  var currentWeek = document.body && document.body.getAttribute('data-week');
  var isIndex = !currentWeek;

  // ---- Hashing ----
  function sha256Hex(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  // ---- Tier checks (read from localStorage; auto-clear stale entries) ----
  function isAdmin() {
    if (!ADMIN_HASH) return false;
    var v = localStorage.getItem(LS_ADMIN);
    if (v && v !== ADMIN_HASH) { localStorage.removeItem(LS_ADMIN); return false; }
    return v === ADMIN_HASH;
  }
  function isCourse() {
    if (!COURSE_HASH) return false;
    var v = localStorage.getItem(LS_COURSE);
    if (v && v !== COURSE_HASH) { localStorage.removeItem(LS_COURSE); return false; }
    return v === COURSE_HASH;
  }
  function getWeekGrants() {
    try { return JSON.parse(localStorage.getItem(LS_WEEKS) || '{}'); }
    catch (e) { return {}; }
  }
  function hasWeekGrant(weekNum) {
    var w = WEEKS[weekNum];
    if (!w || !w.passwordHash) return false;
    var grants = getWeekGrants();
    if (grants[weekNum] && grants[weekNum] !== w.passwordHash) {
      // Stored hash is stale — drop it
      delete grants[weekNum];
      localStorage.setItem(LS_WEEKS, JSON.stringify(grants));
      return false;
    }
    return grants[weekNum] === w.passwordHash;
  }

  // ---- Release date check ----
  function isWeekReleased(weekNum) {
    var w = WEEKS[weekNum];
    if (!w || !w.releaseDate) return false;
    // Compare in local time at start-of-day for the configured release date.
    var d = new Date(w.releaseDate + 'T00:00:00');
    return !isNaN(d.getTime()) && d <= new Date();
  }

  function canAccessWeek(weekNum) {
    if (isAdmin()) return true;
    if (isCourse() && isWeekReleased(weekNum)) return true;
    if (hasWeekGrant(weekNum)) return true;
    return false;
  }

  function accessibleWeekNums() {
    return Object.keys(WEEKS).filter(canAccessWeek);
  }

  // ---- Apply a hashed key — store grant for whichever tier matched ----
  function applyKeyHash(hash) {
    if (ADMIN_HASH && hash === ADMIN_HASH) {
      localStorage.setItem(LS_ADMIN, ADMIN_HASH);
      return 'admin';
    }
    if (COURSE_HASH && hash === COURSE_HASH) {
      localStorage.setItem(LS_COURSE, COURSE_HASH);
      return 'course';
    }
    var matched = null;
    Object.keys(WEEKS).forEach(function (w) {
      if (WEEKS[w].passwordHash && hash === WEEKS[w].passwordHash) {
        var grants = getWeekGrants();
        grants[w] = WEEKS[w].passwordHash;
        localStorage.setItem(LS_WEEKS, JSON.stringify(grants));
        matched = 'week-' + w;
      }
    });
    return matched;
  }

  function stripKeyParam() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has('key')) {
        url.searchParams.delete('key');
        var q = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (q ? '?' + q : '') + url.hash);
      }
    } catch (e) { /* older browsers — ignore */ }
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return iso; }
  }

  // ---- Index-page card filtering ----
  function filterIndexCards() {
    var cards = document.querySelectorAll('.week-card');
    cards.forEach(function (card) {
      var href = card.getAttribute('href') || '';
      var m = href.match(/week_(\d+)\.html/);
      if (!m) return;
      var w = m[1];
      if (canAccessWeek(w)) return;

      // Course-tier user with unreleased week: show locked placeholder card
      var weekCfg = WEEKS[w];
      var courseAndUnreleased = isCourse() && weekCfg && weekCfg.releaseDate && !isWeekReleased(w);
      if (courseAndUnreleased) {
        card.classList.add('week-card-locked');
        card.removeAttribute('href');
        var arrow = card.querySelector('.week-card-arrow');
        if (arrow) arrow.remove();
        var label = document.createElement('span');
        label.className = 'week-card-locked-label';
        label.textContent = 'Available ' + formatDate(weekCfg.releaseDate);
        card.appendChild(label);
      } else {
        card.style.display = 'none';
      }
    });
  }

  // ---- Render the password gate ----
  function showGate(message) {
    document.documentElement.style.visibility = 'visible';
    document.body.innerHTML = '';

    var overlay = document.createElement('div');
    overlay.id = 'auth-gate';
    overlay.innerHTML =
      '<div class="auth-box">' +
        '<h1 class="auth-title">Compassion Course Online</h1>' +
        '<p class="auth-label">Weekly Emails</p>' +
        '<p class="auth-subtitle">' + (message || 'Enter password to continue') + '</p>' +
        '<form id="auth-form">' +
          '<input type="password" id="auth-input" placeholder="Password" autocomplete="current-password" autofocus>' +
          '<button type="submit">Enter</button>' +
        '</form>' +
        '<p id="auth-error" class="auth-error"></p>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('auth-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var pwd = document.getElementById('auth-input').value;
      sha256Hex(pwd).then(function (h) {
        var tier = applyKeyHash(h);
        if (tier) {
          location.reload();
        } else {
          document.getElementById('auth-error').textContent = 'Incorrect password';
          document.getElementById('auth-input').value = '';
          document.getElementById('auth-input').focus();
        }
      });
    });
  }

  // ---- Inject Admin nav button (only if signed in as admin) ----
  function injectAdminNavButton() {
    if (!isAdmin()) return;
    var controls = document.querySelector('.top-nav .nav-controls');
    if (!controls) return;
    if (controls.querySelector('.admin-nav-btn')) return; // already injected
    var a = document.createElement('a');
    a.href = 'admin.html';
    a.className = 'admin-nav-btn';
    a.textContent = 'Admin';
    a.title = 'Admin dashboard';
    // Insert before dark-mode toggle so it reads left-to-right naturally
    var darkBtn = controls.querySelector('#dark-mode-toggle');
    if (darkBtn) controls.insertBefore(a, darkBtn);
    else controls.appendChild(a);
  }

  // ---- Decide what to render ----
  function decideGate() {
    if (isIndex) {
      // Index: show only weeks the user has access to. If they have none and
      // no master tier, show the gate.
      var hasAnyAccess = isAdmin() || isCourse() || accessibleWeekNums().length > 0;
      if (!hasAnyAccess) { showGate(); return; }
      var reveal = function () {
        filterIndexCards();
        injectAdminNavButton();
        document.documentElement.style.visibility = 'visible';
      };
      if (document.readyState !== 'loading') reveal();
      else document.addEventListener('DOMContentLoaded', reveal);
    } else {
      if (canAccessWeek(currentWeek)) {
        var revealWeek = function () {
          injectAdminNavButton();
          document.documentElement.style.visibility = 'visible';
        };
        if (document.readyState !== 'loading') revealWeek();
        else document.addEventListener('DOMContentLoaded', revealWeek);
      } else {
        var msg = 'Enter password to continue';
        if (WEEKS[currentWeek] && WEEKS[currentWeek].releaseDate && !isWeekReleased(currentWeek)) {
          msg = 'This week opens ' + formatDate(WEEKS[currentWeek].releaseDate) + '. Enter password to continue.';
        }
        showGate(msg);
      }
    }
  }

  // ---- Bootstrap ----
  document.documentElement.style.visibility = 'hidden';

  // Apply saved theme + dark-mode button icon before the page is revealed,
  // so users on dark mode don't see a light-mode flash and the button icon
  // doesn't shift from placeholder "Dark" text to an emoji after load.
  try {
    var _isDark = localStorage.getItem('cco-dark-mode') === 'true';
    if (_isDark) document.documentElement.setAttribute('data-theme', 'dark');
    var _dmBtn = document.getElementById('dark-mode-toggle');
    if (_dmBtn) _dmBtn.textContent = _isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
  } catch (e) {}

  var urlKey = new URLSearchParams(window.location.search).get('key');
  if (urlKey) {
    sha256Hex(urlKey).then(function (h) {
      applyKeyHash(h); // saves to localStorage if matched; silent if not
      stripKeyParam();
      decideGate();
    });
  } else {
    decideGate();
  }
})();

(function () {
  'use strict';

  // ---- Needs & Feelings Data ----
  // Source: Thom Bond / NYCNVC "Feelings and Needs List" v5.18.15, 2015
  // PDF: https://static1.squarespace.com/static/5d4cf8c40e6b2e00019c54ae/t/5d785c3c4163c45846e8f54c/1568169020460/needs.pdf
  // Do not paraphrase or "improve" these lists — items that look odd
  // (e.g. "hungry", "closed", bare nouns like "grief" or "wonder") are
  // intentional and part of the Compassion Course curriculum.
  var NEEDS_DATA = {
    'Autonomy': ['Choice','Dignity','Freedom','Independence','Self-Expression','Space','Spontaneity'],
    'Connection': ['Acceptance','Affection','Appreciation','Authenticity','Belonging','Care','Closeness','Communication','Communion','Community','Companionship','Compassion','Consideration','Empathy','Friendship','Inclusion','Inspiration','Integrity','Intimacy','Love','Mutuality','Nurturing','Partnership','Presence','Respect/Self-Respect','Security','Self-Acceptance','Self-Care','Self-Connection','Self-Expression','Shared Reality','Stability','Support','To Know and Be Known','To See and Be Seen','Trust','Understanding','Warmth'],
    'Meaning': ['Awareness','Celebration','Challenge','Clarity','Competence','Consciousness','Contribution','Creativity','Discovery','Efficiency','Effectiveness','Growth','Integration','Integrity','Learning','Mourning','Movement','Participation','Perspective','Presence','Progress','Purpose','Self-Expression','Stimulation','Understanding'],
    'Peace': ['Acceptance','Balance','Beauty','Communion','Ease','Equanimity','Faith','Harmony','Hope','Order','Peace-of-Mind','Space'],
    'Physical Well-Being': ['Air','Care','Comfort','Food','Movement/Exercise','Rest/Sleep','Safety (physical)','Self-Care','Sexual Expression','Shelter','Touch','Water'],
    'Play': ['Adventure','Excitement','Fun','Humor','Joy','Relaxation','Stimulation']
  };

  var FEELINGS_DATA = {
    'Feelings When Needs ARE Met': {
      'Affectionate': ['compassionate','fond','loving','openhearted','tender','warm'],
      'Engaged': ['absorbed','curious','engrossed','enchanted','enthralled','entranced','fascinated','interested','intrigued','involved','open','spellbound','stimulated'],
      'Excited': ['amazed','ardent','aroused','dazzled','energetic','enlivened','enthusiastic','exuberant','invigorated','lively','passionate','surprised','vibrant'],
      'Exhilarated': ['enthralled','radiant','electrified','euphoric','overjoyed','thrilled'],
      'Grateful': ['appreciative','moved','thankful','touched'],
      'Happy': ['amused','blissful','cheerful','delighted','ecstatic','elated','giddy','glad','jolly','joyful','jubilant','merry','overjoyed','pleased','rapturous','tickled'],
      'Hopeful': ['confident','expectant','jazzed','lighthearted','sanguine','up','upbeat'],
      'Inspired': ['amazed','eager','enthused','motivated','moved','psyched','stimulated','stirred','wonder'],
      'Peaceful': ['calm','comfortable','centered','content','equanimity','fulfilled','mellow','open','quiet','relaxed','relieved','satisfied','serene','tranquil'],
      'Refreshed': ['recharged','rejuvenated','renewed','rested','restored','revived']
    },
    'Feelings When Needs Are NOT Met': {
      'Anger': ['aggravated','angry','animosity','annoyed','contempt','disgruntled','enraged','exasperated','furious','hate','hostile','incensed','irate','irritated','irked','livid','miffed','nettled','outraged','peeved','resentful'],
      'Aversion': ['abhorrence','appalled','bothered','displeased','disgust','dislike','enmity','horrified','loathing','repulsion','revulsion'],
      'Confusion': ['ambivalent','baffled','bewildered','conflicted','dazed','discombobulated','disoriented','mixed','mystified','perplexed','puzzled','torn'],
      'Disconnection': ['apathetic','bored','closed','detached','distant','indifferent','listless','numb','withdrawn'],
      'Disquiet': ['agitated','alarmed','concerned','distraught','disconcerted','dismayed','disturbed','frustrated','perturbed','rattled','restless','shocked','startled','surprised','troubled','turbulent','turmoil','uncomfortable','uneasy','unnerved','unsettled','upset'],
      'Embarrassment': ['ashamed','chagrined','discomfited','flustered','mortified','self-conscious'],
      'Fatigue': ['beat','burnt out','depleted','exhausted','listless','pooped','sleepy','tired','weary','wiped out','worn out'],
      'Fear': ['afraid','anxious','apprehensive','dread','fearful','foreboding','frightened','guarded','insecure','leery','mistrustful','panicked','petrified','scared','shaky','terrified','trepidation','wary','worried'],
      'Pain': ['aching','agony','anguished','devastated','grief','heartbroken','hungry','hurting','lonely','miserable','regretful','remorseful'],
      'Sadness': ['depressed','dejected','despairing','despondent','disappointed','discouraged','disheartened','forlorn','gloomy','heavy hearted','hopeless','melancholy','miserable','unhappy','wistful'],
      'Tension': ['anxious','closed','distressed','edgy','fidgety','frazzled','frustrated','jittery','nervous','overwhelmed','restless','stressed out'],
      'Yearning': ['longing','nostalgic','pining']
    }
  };

  // ---- Reading Progress Bar ----
  function initProgressBar() {
    var bar = document.getElementById('progress-bar');
    if (!bar) return;
    window.addEventListener('scroll', function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + '%';
    });
  }

  // ---- Dark Mode Toggle ----
  function initDarkMode() {
    var btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;
    var saved = localStorage.getItem('cco-dark-mode');
    if (saved === 'true') {
      document.documentElement.setAttribute('data-theme', 'dark');
      btn.textContent = '\u2600\uFE0F';
    } else {
      btn.textContent = '\uD83C\uDF19';
    }
    btn.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('cco-dark-mode', 'false');
        btn.textContent = '\uD83C\uDF19';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('cco-dark-mode', 'true');
        btn.textContent = '\u2600\uFE0F';
      }
    });
  }

  // ---- Accordion Sections ----
  function initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(function (header) {
      header.addEventListener('click', function (e) {
        if (e.target.classList.contains('read-badge')) return;
        var isActive = this.classList.contains('active');
        this.classList.toggle('active');
        var card = this.closest('.section-card') || this.parentElement;
        var body = card.querySelector('.accordion-body');
        if (body) {
          if (isActive) {
            body.classList.remove('open');
          } else {
            body.classList.add('open');
          }
        }
      });
    });
  }

  // ---- Expand / Collapse All ----
  function initExpandCollapse() {
    var btn = document.getElementById('expand-collapse-all');
    if (!btn) return;
    var expanded = false;

    btn.addEventListener('click', function () {
      var headers = document.querySelectorAll('.accordion-header');
      expanded = !expanded;

      headers.forEach(function (header) {
        var card = header.closest('.section-card') || header.parentElement;
        var body = card.querySelector('.accordion-body');
        if (!body) return;

        if (expanded) {
          header.classList.add('active');
          body.classList.add('open');
        } else {
          header.classList.remove('active');
          body.classList.remove('open');
        }
      });

      btn.textContent = expanded ? 'Collapse All' : 'Expand All';
    });
  }

  // ---- Dialogue Reveal ----
  // The progressive "Next" / "Reset" dialogue UI was retired in favor of
  // showing the full conversation from the start. The CSS already hides
  // the .dialogue-controls block and shows every .dialogue-line and
  // .dialogue-narration by default, so this initializer no longer has
  // anything to do. We still mark each line `.visible` defensively in
  // case any downstream styles still key on that class.
  function initDialogueReveal() {
    document.querySelectorAll('.dialogue-container').forEach(function (container) {
      container.querySelectorAll('.dialogue-line, .dialogue-narration').forEach(function (line) {
        line.classList.add('visible');
      });
    });
  }

  // ---- Practice Journal (localStorage) ----
  function initJournals() {
    var weekId = document.body.getAttribute('data-week') || 'unknown';
    document.querySelectorAll('.journal-area').forEach(function (textarea) {
      var key = 'cco-journal-' + weekId + '-' + textarea.id;
      var savedNote = document.getElementById(textarea.id + '-saved');

      var saved = localStorage.getItem(key);
      if (saved) {
        textarea.value = saved;
      }

      var saveTimeout;
      textarea.addEventListener('input', function () {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function () {
          localStorage.setItem(key, textarea.value);
          if (savedNote) {
            savedNote.classList.add('show');
            savedNote.textContent = 'Saved';
            setTimeout(function () {
              savedNote.classList.remove('show');
            }, 2000);
          }
        }, 500);
      });
    });
  }

  // ---- Word Count for Journals ----
  function initWordCount() {
    document.querySelectorAll('.journal-area').forEach(function (textarea) {
      var footer = document.createElement('div');
      footer.className = 'journal-footer';

      var countEl = document.createElement('span');
      countEl.className = 'word-count';
      countEl.textContent = '0 words';

      var copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.type = 'button';
      copyBtn.textContent = 'Copy';

      footer.appendChild(countEl);
      footer.appendChild(copyBtn);

      var savedNote = textarea.nextElementSibling;
      if (savedNote && savedNote.classList.contains('journal-saved')) {
        savedNote.parentNode.insertBefore(footer, savedNote.nextSibling);
      } else {
        textarea.parentNode.insertBefore(footer, textarea.nextSibling);
      }

      function updateCount() {
        var text = textarea.value.trim();
        var words = text ? text.split(/\s+/).length : 0;
        countEl.textContent = words + (words === 1 ? ' word' : ' words');
      }

      updateCount();
      textarea.addEventListener('input', updateCount);

      copyBtn.addEventListener('click', function () {
        if (!textarea.value.trim()) return;
        navigator.clipboard.writeText(textarea.value).then(function () {
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('copied');
          setTimeout(function () {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
    });
  }

  // ---- Section Read Tracking ----
  var _readSections = {};
  var _readStorageKey = '';

  function initSectionRead() {
    var weekId = document.body.getAttribute('data-week') || 'unknown';
    _readStorageKey = 'cco-read-' + weekId;
    try {
      _readSections = JSON.parse(localStorage.getItem(_readStorageKey)) || {};
    } catch (e) { _readSections = {}; }

    document.querySelectorAll('.section-card').forEach(function (section) {
      var sectionId = section.id;
      if (!sectionId) return;

      if (sectionId === 'resources' || sectionId === 'info') return;

      var header = section.querySelector('.accordion-header');
      var content = section.querySelector('.accordion-content');
      if (!header || !content) return;

      var badge = document.createElement('span');
      badge.className = 'read-badge';
      if (_readSections[sectionId]) badge.classList.add('visible');
      var chevron = header.querySelector('.accordion-chevron');
      if (chevron) {
        header.insertBefore(badge, chevron);
      }

      var readBtn = document.createElement('button');
      readBtn.type = 'button';
      readBtn.className = 'section-read-btn';
      if (_readSections[sectionId]) readBtn.classList.add('read');

      var checkSpan = document.createElement('span');
      checkSpan.className = 'read-check';
      checkSpan.textContent = _readSections[sectionId] ? '\u2713' : '';

      var labelSpan = document.createElement('span');
      labelSpan.textContent = _readSections[sectionId] ? 'Completed' : 'Mark as read';

      readBtn.appendChild(checkSpan);
      readBtn.appendChild(labelSpan);
      content.appendChild(readBtn);

      readBtn.addEventListener('click', function () {
        var isRead = readBtn.classList.contains('read');
        if (isRead) {
          readBtn.classList.remove('read');
          checkSpan.textContent = '';
          labelSpan.textContent = 'Mark as read';
          badge.classList.remove('visible');
          delete _readSections[sectionId];
        } else {
          readBtn.classList.add('read');
          checkSpan.textContent = '\u2713';
          labelSpan.textContent = 'Completed';
          badge.classList.add('visible');
          _readSections[sectionId] = true;
        }
        localStorage.setItem(_readStorageKey, JSON.stringify(_readSections));
        updateProgressRing();
        checkCelebration(weekId);
      });
    });
  }

  // ---- Reflection Timer ----
  function initReflectionTimer() {
    document.querySelectorAll('.practice-card').forEach(function (card) {
      var container = document.createElement('div');
      container.className = 'timer-container';

      var label = document.createElement('span');
      label.className = 'timer-label';
      label.textContent = 'Reflect:';

      var display = document.createElement('span');
      display.className = 'timer-display';
      display.style.display = 'none';

      container.appendChild(label);

      var durations = [1, 3, 5];
      var activeInterval = null;

      durations.forEach(function (mins) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'timer-btn';
        btn.textContent = mins + ' min';

        btn.addEventListener('click', function () {
          if (activeInterval) {
            clearInterval(activeInterval);
            container.querySelectorAll('.timer-btn').forEach(function (b) {
              b.classList.remove('active');
            });
          }

          btn.classList.add('active');
          display.style.display = 'inline';
          display.classList.remove('done');

          var remaining = mins * 60;
          function updateDisplay() {
            var m = Math.floor(remaining / 60);
            var s = remaining % 60;
            display.textContent = m + ':' + (s < 10 ? '0' : '') + s;
          }
          updateDisplay();

          activeInterval = setInterval(function () {
            remaining--;
            updateDisplay();
            if (remaining <= 0) {
              clearInterval(activeInterval);
              activeInterval = null;
              display.textContent = 'Done';
              display.classList.add('done');
              btn.classList.remove('active');
            }
          }, 1000);
        });

        container.appendChild(btn);
      });

      container.appendChild(display);
      card.appendChild(container);
    });
  }

  // ---- Key Concept Highlighting ----
  function initHighlights() {
    // Key concepts are styled inline only — no click interaction
  }

  // ---- Back to Top ----
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- Rating Sliders (Week 4) ----
  function initRatingSliders() {
    document.querySelectorAll('.rating-slider').forEach(function (slider) {
      var valueDisplay = slider.nextElementSibling;
      var weekId = document.body.getAttribute('data-week') || 'unknown';
      var key = 'cco-rating-' + weekId + '-' + slider.id;

      var saved = localStorage.getItem(key);
      if (saved) {
        slider.value = saved;
        if (valueDisplay) valueDisplay.textContent = saved;
      }

      slider.addEventListener('input', function () {
        if (valueDisplay) valueDisplay.textContent = this.value;
        localStorage.setItem(key, this.value);
      });
    });
  }

  // ---- Scroll Animations ----
  function initScrollAnimations() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section-card, .practice-card').forEach(function (el) {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ---- Google Translate ----
  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      { pageLanguage: 'en', layout: google.translate.TranslateElement.InlineLayout.SIMPLE },
      'google_translate_element'
    );
  };

  // ---- Inline Reference Panel Builder ----
  function buildReferencePanel(type, data, urlPattern, label, sourceUrl, icon) {
    var panels = {};

    // Find all links matching the URL pattern
    var links = document.querySelectorAll('.accordion-content a[href*="' + urlPattern + '"]');
    if (!links.length) return;

    links.forEach(function (link) {
      var section = link.closest('.accordion-content');
      if (!section) return;

      var sectionKey = section.parentElement && section.parentElement.parentElement
        ? section.parentElement.parentElement.id || 'section'
        : 'section';

      // Only create one panel per section
      if (panels[sectionKey]) return;

      // Build unified expandable panel (header + body as one component)
      var panel = document.createElement('div');
      panel.className = 'inline-reference-panel';

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'reference-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span class="reference-toggle-icon">' + icon + '</span>' +
        '<span class="reference-toggle-label">' + type + ' List</span>' +
        '<span class="reference-toggle-chevron">\u25BC</span>';

      var body = document.createElement('div');
      body.className = 'reference-panel-body';

      // Build content based on data structure
      if (type === 'Needs') {
        Object.keys(data).forEach(function (category) {
          var catDiv = document.createElement('div');
          catDiv.className = 'reference-category';
          var catTitle = document.createElement('h5');
          catTitle.className = 'reference-category-title';
          catTitle.textContent = category;
          catDiv.appendChild(catTitle);
          var tags = document.createElement('div');
          tags.className = 'reference-tags';
          data[category].forEach(function (need) {
            var tag = document.createElement('span');
            tag.className = 'reference-tag';
            tag.textContent = need;
            tags.appendChild(tag);
          });
          catDiv.appendChild(tags);
          body.appendChild(catDiv);
        });
      } else if (type === 'Feelings') {
        Object.keys(data).forEach(function (groupName) {
          var group = document.createElement('div');
          var isPositive = groupName.indexOf('ARE Met') !== -1;
          group.className = 'reference-group reference-group--' + (isPositive ? 'positive' : 'negative');
          var groupTitle = document.createElement('h4');
          groupTitle.className = 'reference-group-title';
          groupTitle.textContent = groupName;
          group.appendChild(groupTitle);
          Object.keys(data[groupName]).forEach(function (category) {
            var catDiv = document.createElement('div');
            catDiv.className = 'reference-category';
            var catTitle = document.createElement('h5');
            catTitle.className = 'reference-category-title';
            catTitle.textContent = category;
            catDiv.appendChild(catTitle);
            var tags = document.createElement('div');
            tags.className = 'reference-tags';
            data[groupName][category].forEach(function (feeling) {
              var tag = document.createElement('span');
              tag.className = 'reference-tag';
              tag.textContent = feeling;
              tags.appendChild(tag);
            });
            catDiv.appendChild(tags);
            group.appendChild(catDiv);
          });
          body.appendChild(group);
        });
      }

      // Source link
      var source = document.createElement('p');
      source.className = 'reference-source';
      source.innerHTML = 'Source: <a href="' + sourceUrl + '" target="_blank" rel="noopener">NYCNVC ' + type + ' List</a>';
      body.appendChild(source);

      panel.appendChild(toggle);
      panel.appendChild(body);

      // Toggle expand/collapse
      toggle.addEventListener('click', function () {
        var isOpen = body.classList.contains('open');
        body.classList.toggle('open');
        toggle.setAttribute('aria-expanded', !isOpen);
        toggle.querySelector('.reference-toggle-chevron').textContent = isOpen ? '\u25BC' : '\u25B2';
        if (!isOpen) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      // Insert after the link's wrapper paragraph/list item
      var linkWrapper = link.closest('p, li');
      if (linkWrapper) {
        linkWrapper.parentNode.insertBefore(panel, linkWrapper.nextSibling);
      } else {
        link.parentNode.insertBefore(panel, link.nextSibling);
      }

      panels[sectionKey] = panel;
    });
  }

  // ---- Inline Needs Panel ----
  function initNeedsPanel() {
    buildReferencePanel('Needs', NEEDS_DATA, 'nycnvc.org/needs', 'Needs List Reference', 'http://www.nycnvc.org/needs/', '\uD83D\uDCCB');
  }

  // ---- Inline Feelings Panel ----
  function initFeelingsPanel() {
    buildReferencePanel('Feelings', FEELINGS_DATA, 'nycnvc.org/feelings', 'Feelings List Reference', 'http://www.nycnvc.org/feelings/', '\uD83D\uDC9A');
  }

  // ---- Breathing Widget ----
  function initBreathingWidget() {
    var practicesSections = document.querySelectorAll('#practices .accordion-content');
    if (!practicesSections.length) return;

    practicesSections.forEach(function (section) {
      var widget = document.createElement('div');
      widget.className = 'breathing-widget';

      var prompt = document.createElement('p');
      prompt.className = 'breathing-prompt';
      prompt.textContent = 'Take a moment to center yourself before practicing.';

      var container = document.createElement('div');
      container.className = 'breathing-container';

      var circle = document.createElement('div');
      circle.className = 'breathing-circle';

      var text = document.createElement('span');
      text.className = 'breathing-text';
      text.textContent = 'Breathe';

      circle.appendChild(text);
      container.appendChild(circle);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'breathing-btn';
      btn.textContent = 'Start Breathing';

      var isActive = false;
      var textInterval = null;

      btn.addEventListener('click', function () {
        isActive = !isActive;
        if (isActive) {
          circle.classList.add('active');
          btn.textContent = 'Stop';
          btn.classList.add('active');
          // Cycle text to match CSS animation phases
          var phase = 0;
          function updateText() {
            if (phase === 0) {
              text.textContent = 'Breathe In';
              phase = 1;
            } else if (phase === 1) {
              text.textContent = 'Hold';
              phase = 2;
            } else if (phase === 2) {
              text.textContent = 'Breathe Out';
              phase = 3;
            } else {
              text.textContent = 'Breathe In';
              phase = 1;
            }
          }
          updateText();
          textInterval = setInterval(function () {
            updateText();
          }, 2000);
        } else {
          circle.classList.remove('active');
          btn.textContent = 'Start Breathing';
          btn.classList.remove('active');
          text.textContent = 'Breathe';
          if (textInterval) {
            clearInterval(textInterval);
            textInterval = null;
          }
        }
      });

      widget.appendChild(prompt);
      widget.appendChild(container);
      widget.appendChild(btn);
      section.insertBefore(widget, section.firstChild);
    });
  }

  // ---- Progress Ring ----
  var _progressRingFill = null;
  var _progressRingText = null;

  function initProgressRing() {
    var tocActions = document.querySelector('.toc-actions');
    if (!tocActions) return;

    var container = document.createElement('div');
    container.className = 'progress-ring-container';
    container.title = 'Section completion';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'progress-ring');
    svg.setAttribute('width', '42');
    svg.setAttribute('height', '42');
    svg.setAttribute('viewBox', '0 0 42 42');

    var bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '21');
    bgCircle.setAttribute('cy', '21');
    bgCircle.setAttribute('r', '18');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', '#e0dbd2');
    bgCircle.setAttribute('stroke-width', '3');

    var fillCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fillCircle.setAttribute('class', 'progress-ring-fill');
    fillCircle.setAttribute('cx', '21');
    fillCircle.setAttribute('cy', '21');
    fillCircle.setAttribute('r', '18');
    fillCircle.setAttribute('fill', 'none');
    fillCircle.setAttribute('stroke', '#2a7a6e');
    fillCircle.setAttribute('stroke-width', '3');
    var circumference = 2 * Math.PI * 18;
    fillCircle.setAttribute('stroke-dasharray', circumference.toFixed(2));
    fillCircle.setAttribute('stroke-dashoffset', circumference.toFixed(2));
    fillCircle.setAttribute('stroke-linecap', 'round');
    fillCircle.setAttribute('transform', 'rotate(-90 21 21)');

    svg.appendChild(bgCircle);
    svg.appendChild(fillCircle);

    var textEl = document.createElement('span');
    textEl.className = 'progress-ring-text';
    textEl.textContent = '0%';

    container.appendChild(svg);
    container.appendChild(textEl);
    tocActions.insertBefore(container, tocActions.firstChild);

    _progressRingFill = fillCircle;
    _progressRingText = textEl;

    updateProgressRing();
  }

  function updateProgressRing() {
    if (!_progressRingFill || !_progressRingText) return;

    var totalSections = document.querySelectorAll('.section-card:not(#resources):not(#info)');
    var total = 0;
    totalSections.forEach(function (s) {
      if (s.id) total++;
    });
    var readCount = Object.keys(_readSections).length;
    var pct = total > 0 ? Math.round((readCount / total) * 100) : 0;

    var circumference = 2 * Math.PI * 18;
    var offset = circumference - (pct / 100) * circumference;
    _progressRingFill.setAttribute('stroke-dashoffset', offset.toFixed(2));
    _progressRingText.textContent = pct + '%';
  }

  // ---- Typewriter Effect on Blockquotes ----
  function initTypewriterQuotes() {
    var quotes = document.querySelectorAll('blockquote');
    if (!quotes.length) return;

    quotes.forEach(function (quote) {
      var p = quote.querySelector('p');
      if (!p) return;
      // Only apply to simple text (no nested HTML elements like key-concept spans)
      if (p.children.length > 0) return;

      var originalText = p.textContent;
      quote.setAttribute('data-original-text', originalText);
      p.textContent = '';
      quote.classList.add('typewriter-ready');

      var cursor = document.createElement('span');
      cursor.className = 'typewriter-cursor';
      p.appendChild(cursor);

      var started = false;
      function tryStart() {
        if (started) return;
        started = true;
        setTimeout(function () {
          startTypewriter(quote);
        }, 400);
      }

      // Check if inside an accordion
      var accordionBody = quote.closest('.accordion-body');
      if (!accordionBody) {
        // Not inside an accordion — use IntersectionObserver
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              tryStart();
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.3 });
        observer.observe(quote);
        return;
      }

      // If already open, start now
      if (accordionBody.classList.contains('open')) {
        tryStart();
        return;
      }

      // Watch for accordion to open
      var obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === 'class' && accordionBody.classList.contains('open')) {
            tryStart();
            obs.disconnect();
          }
        });
      });
      obs.observe(accordionBody, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function startTypewriter(quote) {
    var p = quote.querySelector('p');
    var cursor = p.querySelector('.typewriter-cursor');
    var text = quote.getAttribute('data-original-text');
    if (!text) return;

    var textNode = document.createTextNode('');
    p.insertBefore(textNode, cursor);

    var i = 0;
    var interval = setInterval(function () {
      if (i < text.length) {
        textNode.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        quote.classList.add('typewriter-complete');
      }
    }, 25);
  }

  // ---- Animated Step Reveals ----
  function initStepReveals() {
    var stepContainers = document.querySelectorAll('.step-cards');
    if (!stepContainers.length) return;

    stepContainers.forEach(function (container) {
      var steps = container.querySelectorAll('.step-card');
      steps.forEach(function (step) {
        step.classList.add('step-animate');
      });

      var revealed = false;
      function revealSteps() {
        if (revealed) return;
        revealed = true;
        steps.forEach(function (step, index) {
          setTimeout(function () {
            step.classList.add('step-visible');
          }, 200 + index * 300);
        });
      }

      // Watch for the accordion body gaining the 'open' class
      var accordionBody = container.closest('.accordion-body');
      if (!accordionBody) {
        revealSteps();
        return;
      }

      // If already open, reveal now
      if (accordionBody.classList.contains('open')) {
        revealSteps();
        return;
      }

      // Use MutationObserver to detect when accordion opens
      var obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === 'class' && accordionBody.classList.contains('open')) {
            setTimeout(revealSteps, 200);
            obs.disconnect();
          }
        });
      });
      obs.observe(accordionBody, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // ---- Celebration Animation ----
  function showCelebration() {
    var overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';

    var message = document.createElement('div');
    message.className = 'celebration-message';
    message.innerHTML = '<h3>Week Complete!</h3><p>You\'ve read all sections. Well done.</p>';
    overlay.appendChild(message);
    document.body.appendChild(overlay);

    // Spawn particles
    var colors = ['#2a7a6e', '#e8a838', '#8fad8b', '#c9827a', '#3a9e8f'];
    for (var i = 0; i < 30; i++) {
      var particle = document.createElement('div');
      particle.className = 'celebration-particle';
      particle.style.left = Math.random() * 100 + 'vw';
      particle.style.top = '-10px';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDelay = (Math.random() * 0.5) + 's';
      particle.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      particle.style.width = (6 + Math.random() * 6) + 'px';
      particle.style.height = particle.style.width;
      document.body.appendChild(particle);
      (function (p) {
        setTimeout(function () { p.remove(); }, 3500);
      })(particle);
    }

    // Auto-dismiss
    setTimeout(function () {
      message.classList.add('celebration-fade-out');
      setTimeout(function () { overlay.remove(); }, 500);
    }, 3000);
  }

  function checkCelebration(weekId) {
    var allSections = document.querySelectorAll('.section-card:not(#resources):not(#info)');
    var allRead = true;
    var count = 0;
    allSections.forEach(function (s) {
      if (!s.id) return;
      count++;
      if (!_readSections[s.id]) allRead = false;
    });

    if (allRead && count > 0) {
      var celebKey = 'cco-celebrated-' + weekId;
      if (!localStorage.getItem(celebKey)) {
        showCelebration();
        localStorage.setItem(celebKey, 'true');
      }
    }
  }

  // ---- ElevenLabs TTS Narration ----

  var _narrationAudio = null;
  var _narrationState = 'idle'; // idle | loading | playing | paused
  var _narrationQueue = []; // for sequential playback of multiple sections
  var _narrationQueueIndex = 0;
  var _activeNarrateBtn = null; // the button that triggered current playback

  function getWeekId() {
    var weekNum = document.body.getAttribute('data-week') || '1';
    return 'week_' + weekNum;
  }

  // Selectors stripped from content before hashing/narrating.
  // MUST match STRIP_SELECTORS in generate-audio.js exactly.
  var AUDIO_STRIP_SELECTORS = [
    '.inline-reference-panel', '.inline-ref-trigger',
    '.breathing-widget', '.timer-container',
    '.journal-area', '.journal-saved', '.journal-footer',
    '.word-count', '.copy-btn',
    '.section-read-btn', '.section-narrate-btn',
    '.calendar-buttons', '.progress-ring-container',
    '.rating-slider-container',
    '.needs-panel', '.feelings-panel',
    '.celebration-overlay', '.typewriter-cursor',
    '.dialogue-controls'
  ].join(', ');

  // Extract the normalized narration text for a section (same as generate-audio.js)
  function getSectionContentText(card) {
    var content = card.querySelector('.accordion-content');
    if (!content) return '';
    var clone = content.cloneNode(true);
    // initTypewriterQuotes() empties the first <p> of each blockquote and stashes
    // the original text in data-original-text on the blockquote. Restore it so
    // the hash matches what generate-audio.js computes from the raw HTML.
    clone.querySelectorAll('blockquote[data-original-text]').forEach(function (bq) {
      var p = bq.querySelector('p');
      if (p) p.textContent = bq.getAttribute('data-original-text');
    });
    clone.querySelectorAll(AUDIO_STRIP_SELECTORS).forEach(function (el) { el.remove(); });
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  // Short hash of (title + content) for content-addressed audio filenames.
  // MUST match audioHash() in generate-audio.js exactly.
  function audioHash(title, content) {
    var str = title.toLowerCase().trim() + '::' + content.toLowerCase().trim();
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return (h >>> 0).toString(36);
  }

  function getSectionAudioPath(headerEl) {
    var card = headerEl.closest('.section-card');
    var title = headerEl.textContent.trim();
    var content = card ? getSectionContentText(card) : '';
    // Content-addressed: hash alone identifies the file, so identical sections
    // across different weeks share one audio file.
    return 'audio/' + audioHash(title, content) + '.mp3';
  }


  // Check if a static file exists (returns promise resolving to boolean)
  function staticFileExists(path) {
    return fetch(path, { method: 'HEAD' }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  // Load all audio parts for a section, returns Promise<Audio[]>
  // Only plays pre-generated static files (no live API calls)
  function loadSectionAudioParts(audioPath) {
    var basePath = audioPath.replace('.mp3', '');

    // First check if multi-part files exist (e.g. audio/{hash}_part1.mp3)
    return staticFileExists(basePath + '_part1.mp3').then(function (hasParts) {
      if (hasParts) {
        var parts = [];
        var partNum = 1;
        function loadNext() {
          return staticFileExists(basePath + '_part' + partNum + '.mp3').then(function (exists) {
            if (!exists) return parts;
            parts.push(new Audio(basePath + '_part' + partNum + '.mp3'));
            partNum++;
            return loadNext();
          });
        }
        return loadNext();
      }

      // Check single file
      return staticFileExists(audioPath).then(function (exists) {
        if (exists) return [new Audio(audioPath)];
        return [];
      });
    });
  }

  // --- Per-section narrate buttons ---
  function initSectionNarration() {
    // Inject the disabled-state styling once (graying out narrate buttons
    // when their audio file isn't on storage yet).
    if (!document.getElementById('section-narrate-no-audio-css')) {
      var st = document.createElement('style');
      st.id = 'section-narrate-no-audio-css';
      st.textContent =
        '.section-narrate-btn.no-audio{opacity:0.25 !important;' +
        'cursor:not-allowed !important;filter:grayscale(1) !important;}' +
        '.section-narrate-btn.no-audio:hover{transform:none !important;' +
        'background:inherit !important;opacity:0.25 !important;}';
      document.head.appendChild(st);
    }
    var cards = document.querySelectorAll('.section-card');
    cards.forEach(function (card) {
      if (isNonNarratedSection(card)) return; // no narrate button on info/resources
      var header = card.querySelector('.accordion-header');
      var body = card.querySelector('.accordion-body');
      if (!header || !body) return;

      var sectionName = header.querySelector('h2') ? header.querySelector('h2').textContent.trim() : header.textContent.trim();
      // Remove chevron text from section name
      sectionName = sectionName.replace(/[▼▲]/g, '').trim();

      var btn = document.createElement('button');
      btn.className = 'section-narrate-btn';
      btn.type = 'button';
      btn.title = 'Narrate ' + sectionName;
      btn.innerHTML = ICON_SPEAKER;
      btn.setAttribute('data-state', 'idle');
      card.insertBefore(btn, body);

      // Position vertically centered with header
      function alignBtn() {
        var hh = header.offsetHeight;
        btn.style.top = ((hh - btn.offsetHeight) / 2) + 'px';
      }
      alignBtn();
      window.addEventListener('resize', alignBtn);

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.classList.contains('no-audio')) return;  // disabled — no file
        var state = btn.getAttribute('data-state');
        if (state === 'idle') {
          stopAllNarration();
          playSingleSection(btn, body);
        } else if (state === 'playing') {
          pauseCurrentNarration();
        } else if (state === 'paused') {
          resumeCurrentNarration();
        }
      });

      // Probe whether this section's audio (or its first part) actually
      // exists; gray out the button if not. Lets us ship lessons whose
      // narration hasn't been generated yet without misleading clicks.
      // The existing fetch override inside the React iframe responds
      // 404 for audio paths missing from the audio map, so this works
      // both in the iframe and on direct file hosting.
      (function checkAudioAvailability() {
        var audioPath = getSectionAudioPath(header);
        var basePath = audioPath.replace('.mp3', '');
        Promise.all([
          staticFileExists(audioPath),
          staticFileExists(basePath + '_part1.mp3'),
        ]).then(function (results) {
          var anyExists = results[0] || results[1];
          if (!anyExists) {
            btn.classList.add('no-audio');
            btn.setAttribute('aria-disabled', 'true');
            btn.title = 'Audio not yet available for this section';
          }
        }).catch(function () { /* noop — leave button enabled */ });
      })();
    });
  }

  // --- Floating audio control bar ---
  var _audioBar = null;
  var _seekSlider = null;
  var _timeLabel = null;
  var _seekUpdateId = null;

  function createAudioBar() {
    if (_audioBar) return;
    var bar = document.createElement('div');
    bar.id = 'audio-bar';
    bar.innerHTML =
      '<button class="audio-bar-btn ab-skip" id="ab-rew" title="Rewind 10 seconds"><span class="ab-skip-arrow">\u25C0</span><span class="ab-skip-label">10</span></button>' +
      '<button class="audio-bar-btn" id="ab-play" title="Play / Pause">\u2759\u2759</button>' +
      '<button class="audio-bar-btn ab-skip" id="ab-fwd" title="Forward 10 seconds"><span class="ab-skip-label">10</span><span class="ab-skip-arrow">\u25B6</span></button>' +
      '<input type="range" id="ab-seek" min="0" max="100" value="0" step="0.5">' +
      '<span id="ab-time">0:00</span>' +
      '<button class="audio-bar-btn audio-bar-close" id="ab-stop" title="Stop">&times;</button>';
    document.body.appendChild(bar);
    _audioBar = bar;
    _seekSlider = document.getElementById('ab-seek');
    _timeLabel = document.getElementById('ab-time');

    document.getElementById('ab-rew').addEventListener('click', function () {
      if (_narrationAudio) _narrationAudio.currentTime = Math.max(0, _narrationAudio.currentTime - 10);
    });
    document.getElementById('ab-fwd').addEventListener('click', function () {
      if (_narrationAudio) _narrationAudio.currentTime = Math.min(_narrationAudio.duration || 0, _narrationAudio.currentTime + 10);
    });
    document.getElementById('ab-play').addEventListener('click', function () {
      if (!_narrationAudio) return;
      if (_narrationAudio.paused) {
        resumeCurrentNarration();
      } else {
        pauseCurrentNarration();
      }
    });
    document.getElementById('ab-stop').addEventListener('click', function () {
      stopAllNarration();
    });

    var seeking = false;
    _seekSlider.addEventListener('input', function () {
      seeking = true;
      if (_narrationAudio && _narrationAudio.duration) {
        _narrationAudio.currentTime = (_seekSlider.value / 100) * _narrationAudio.duration;
      }
    });
    _seekSlider.addEventListener('change', function () { seeking = false; });

    // Update seek slider position
    function updateSeek() {
      if (_narrationAudio && isFinite(_narrationAudio.duration) && _narrationAudio.duration > 0 && !seeking) {
        var pct = (_narrationAudio.currentTime / _narrationAudio.duration) * 100;
        _seekSlider.value = pct;
        _timeLabel.textContent = formatTime(_narrationAudio.currentTime) + ' / ' + formatTime(_narrationAudio.duration);
      } else if (_narrationAudio) {
        _timeLabel.textContent = formatTime(_narrationAudio.currentTime);
      }
      _seekUpdateId = requestAnimationFrame(updateSeek);
    }
    _seekUpdateId = requestAnimationFrame(updateSeek);
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function showAudioBar() {
    createAudioBar();
    _audioBar.classList.add('visible');
    var playBtn = document.getElementById('ab-play');
    if (playBtn) playBtn.innerHTML = ICON_PAUSE;
  }

  function hideAudioBar() {
    if (_audioBar) _audioBar.classList.remove('visible');
    if (_seekSlider) { _seekSlider.value = 0; }
    if (_timeLabel) _timeLabel.textContent = '0:00';
  }

  // Play an array of Audio objects in sequence
  function playAudioSequence(audios, onEnd) {
    showAudioBar();
    var index = 0;
    function playNext() {
      if (index >= audios.length) { hideAudioBar(); onEnd(); return; }
      _narrationAudio = audios[index];
      function onEnded() {
        _narrationAudio.removeEventListener('ended', onEnded);
        index++;
        playNext();
      }
      _narrationAudio.addEventListener('ended', onEnded);
      _narrationAudio.play();
    }
    playNext();
  }

  function playSingleSection(btn, body) {
    var card = body.closest('.section-card') || body.parentElement;
    var header = card.querySelector('.accordion-header');
    var audioPath = getSectionAudioPath(header);

    btn.setAttribute('data-state', 'loading');
    btn.innerHTML = ICON_LOADING;
    _activeNarrateBtn = btn;
    _narrationState = 'loading';

    loadSectionAudioParts(audioPath).then(function (audios) {
      if (!audios.length) { resetNarrateBtn(btn); _narrationState = 'idle'; return; }
      playAudioSequence(audios, function () {
        resetNarrateBtn(btn);
        _narrationAudio = null;
        _activeNarrateBtn = null;
        _narrationState = 'idle';
      });
      btn.setAttribute('data-state', 'playing');
      btn.innerHTML = ICON_PAUSE;
      _narrationState = 'playing';
    }).catch(function () {
      alert('Narration failed for this section.');
      resetNarrateBtn(btn);
      _narrationState = 'idle';
    });
  }

  function resetNarrateBtn(btn) {
    btn.setAttribute('data-state', 'idle');
    btn.innerHTML = ICON_SPEAKER;
  }

  function resetAllSectionBtns() {
    document.querySelectorAll('.section-narrate-btn').forEach(function (btn) {
      resetNarrateBtn(btn);
    });
  }

  // --- Main nav narrate button (plays all sections sequentially) ---
  function initNarration() {
    var navControls = document.querySelector('.nav-controls');
    if (!navControls) return;
    // Only add the narrate button on pages that actually have sections to
    // narrate (i.e. week pages). Skip the index/admin pages.
    if (!document.querySelector('.section-card')) return;

    var btn = document.createElement('button');
    btn.id = 'narrate-btn';
    btn.type = 'button';
    btn.title = 'Narrate full weekly lesson';
    btn.innerHTML = ICON_SPEAKER;
    navControls.insertBefore(btn, navControls.firstChild);

    btn.addEventListener('click', function () {
      if (_narrationState === 'idle' || (_narrationState !== 'idle' && !_narrationQueue.length)) {
        // Idle, or a single section is playing — start full narration from the top
        startFullNarration(btn);
      } else if (_narrationState === 'playing') {
        pauseCurrentNarration();
      } else if (_narrationState === 'paused') {
        resumeCurrentNarration();
      }
    });

    btn.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      stopAllNarration();
    });

    // Hide when translated
    function checkLanguage() {
      var cookie = document.cookie;
      var match = cookie.match(/googtrans=\/en\/(\w+)/);
      var isTranslated = match && match[1] && match[1] !== 'en';
      var htmlLang = document.documentElement.lang;
      if (htmlLang && htmlLang !== 'en' && htmlLang.indexOf('en') !== 0) isTranslated = true;
      var display = isTranslated ? 'none' : '';
      btn.style.display = display;
      document.querySelectorAll('.section-narrate-btn').forEach(function (b) { b.style.display = display; });
      if (isTranslated && _narrationState !== 'idle') stopAllNarration();
    }
    checkLanguage();
    setInterval(checkLanguage, 2000);

    // Also init per-section buttons
    initSectionNarration();
  }

  // Sections excluded from narration — the "Compassion Course Information"
  // and "Resources" accordions are reference/boilerplate, not lesson content,
  // so Play All skips them and they get no per-section narrate button.
  function isNonNarratedSection(card) {
    return card && (card.id === 'info' || card.id === 'resources');
  }

  function startFullNarration(btn) {
    stopAllNarration();
    // Build queue of all lesson sections (skip info/resources).
    var cards = document.querySelectorAll('.section-card');
    _narrationQueue = [];
    cards.forEach(function (card) {
      if (isNonNarratedSection(card)) return;
      var header = card.querySelector('.accordion-header');
      var body = card.querySelector('.accordion-body');
      if (!header || !body) return;
      _narrationQueue.push({
        audioPath: getSectionAudioPath(header),
        sectionBtn: card.querySelector('.section-narrate-btn')
      });
    });

    if (!_narrationQueue.length) return;

    _narrationQueueIndex = 0;
    _narrationState = 'loading';
    _activeNarrateBtn = btn;
    btn.innerHTML = ICON_LOADING;
    btn.classList.add('narrating');

    playNextInQueue(btn);
  }

  function playNextInQueue(navBtn) {
    if (_narrationQueueIndex >= _narrationQueue.length) {
      stopAllNarration();
      return;
    }

    var item = _narrationQueue[_narrationQueueIndex];

    // Highlight current section button
    resetAllSectionBtns();
    if (item.sectionBtn) {
      item.sectionBtn.setAttribute('data-state', 'playing');
      item.sectionBtn.innerHTML = ICON_PAUSE;
    }

    loadSectionAudioParts(item.audioPath).then(function (audios) {
      if (!audios.length) {
        if (item.sectionBtn) resetNarrateBtn(item.sectionBtn);
        _narrationQueueIndex++;
        playNextInQueue(navBtn);
        return;
      }
      playAudioSequence(audios, function () {
        if (item.sectionBtn) resetNarrateBtn(item.sectionBtn);
        _narrationQueueIndex++;
        playNextInQueue(navBtn);
      });
      _narrationState = 'playing';
      navBtn.innerHTML = ICON_PAUSE;
    }).catch(function () {
      if (item.sectionBtn) resetNarrateBtn(item.sectionBtn);
      _narrationQueueIndex++;
      playNextInQueue(navBtn);
    });
  }

  // --- Centralized UI sync for all play controls ---
  var ICON_PLAY = '\u25B6';
  var ICON_PAUSE = '\u2759\u2759';
  var ICON_SPEAKER = '\uD83D\uDD0A';
  var ICON_LOADING = '\u23F3';

  function syncAllPlayButtons(state) {
    var icon = (state === 'playing') ? ICON_PAUSE : ICON_PLAY;
    var dataState = (state === 'playing') ? 'playing' : 'paused';

    // 1. Audio bar play button
    var abPlay = document.getElementById('ab-play');
    if (abPlay) abPlay.innerHTML = icon;

    // 2. Nav button (top bar)
    var navBtn = document.getElementById('narrate-btn');
    if (navBtn && (navBtn === _activeNarrateBtn || _narrationQueue.length)) {
      navBtn.innerHTML = icon;
    }

    // 3. Active section button (single-section playback)
    if (_activeNarrateBtn && _activeNarrateBtn.classList.contains('section-narrate-btn')) {
      _activeNarrateBtn.setAttribute('data-state', dataState);
      _activeNarrateBtn.innerHTML = icon;
    }

    // 4. Current queue section button (full narration)
    if (_narrationQueue.length) {
      var item = _narrationQueue[_narrationQueueIndex];
      if (item && item.sectionBtn) {
        item.sectionBtn.setAttribute('data-state', dataState);
        item.sectionBtn.innerHTML = icon;
      }
    }
  }

  // --- Shared pause/resume/stop ---
  function pauseCurrentNarration() {
    if (_narrationAudio) {
      _narrationAudio.pause();
      _narrationState = 'paused';
      syncAllPlayButtons('paused');
    }
  }

  function resumeCurrentNarration() {
    if (_narrationAudio) {
      _narrationAudio.play();
      _narrationState = 'playing';
      syncAllPlayButtons('playing');
    }
  }

  function stopAllNarration() {
    if (_narrationAudio) {
      _narrationAudio.pause();
      _narrationAudio.currentTime = 0;
      _narrationAudio = null;
    }
    _narrationState = 'idle';
    _narrationQueue = [];
    _narrationQueueIndex = 0;
    hideAudioBar();
    // Reset nav button
    var navBtn = document.getElementById('narrate-btn');
    if (navBtn) {
      navBtn.innerHTML = ICON_SPEAKER;
      navBtn.classList.remove('narrating');
    }
    // Reset all section buttons
    resetAllSectionBtns();
    _activeNarrateBtn = null;
  }

  // ---- Add-to-Calendar for Monthly Conferences ----
  function initCalendarButtons() {
    var ZOOM_URL = 'https://us06web.zoom.us/j/81925069376?pwd=AqvTHV0FbEUgGWh4Zea8wy2A3pYuHH.1';
    var TITLE = 'Compassion Course Monthly Conference';
    var DESC = 'Monthly 90-min conference with Thom Bond via Zoom.\\n' + ZOOM_URL;
    var LOCATION = 'Zoom';

    // Find "Monthly Conferences" h3 headings
    var headings = document.querySelectorAll('.accordion-content h3');
    headings.forEach(function (h3) {
      if (h3.textContent.trim() !== 'Monthly Conferences') return;

      // Compute next 2nd Monday from today
      function getNextSecondMonday() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();

        // Find 2nd Monday of current month
        var first = new Date(year, month, 1);
        var dayOfWeek = first.getDay();
        var firstMonday = dayOfWeek <= 1 ? (1 + (1 - dayOfWeek)) : (1 + (8 - dayOfWeek));
        var secondMonday = firstMonday + 7;
        var candidate = new Date(year, month, secondMonday, 12, 0, 0);

        // If already past, get next month's
        if (candidate < now) {
          month++;
          if (month > 11) { month = 0; year++; }
          first = new Date(year, month, 1);
          dayOfWeek = first.getDay();
          firstMonday = dayOfWeek <= 1 ? (1 + (1 - dayOfWeek)) : (1 + (8 - dayOfWeek));
          secondMonday = firstMonday + 7;
          candidate = new Date(year, month, secondMonday, 12, 0, 0);
        }
        return candidate;
      }

      var nextConf = getNextSecondMonday();

      // Format for calendar URLs
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      function toUTC(d) {
        // Conference is 12:00 PM EDT (UTC-4)
        var utc = new Date(d.getTime());
        // Set to EDT noon: add 4 hours for UTC
        utc.setUTCHours(16, 0, 0, 0);
        utc.setUTCFullYear(d.getFullYear());
        utc.setUTCMonth(d.getMonth());
        utc.setUTCDate(d.getDate());
        return utc;
      }
      var start = toUTC(nextConf);
      var end = new Date(start.getTime() + 90 * 60 * 1000);

      function fmtICal(d) {
        return d.getUTCFullYear() +
          pad(d.getUTCMonth() + 1) +
          pad(d.getUTCDate()) + 'T' +
          pad(d.getUTCHours()) +
          pad(d.getUTCMinutes()) +
          pad(d.getUTCSeconds()) + 'Z';
      }
      var startStr = fmtICal(start);
      var endStr = fmtICal(end);

      // Recurrence: 2nd Monday every month
      var RRULE = 'RRULE:FREQ=MONTHLY;BYDAY=2MO';

      // Google Calendar URL
      var googleUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent(TITLE) +
        '&dates=' + startStr + '/' + endStr +
        '&details=' + encodeURIComponent(DESC) +
        '&location=' + encodeURIComponent(LOCATION) +
        '&recur=' + encodeURIComponent(RRULE);

      // Outlook Web URL
      var outlookUrl = 'https://outlook.live.com/calendar/0/action/compose?allday=false' +
        '&subject=' + encodeURIComponent(TITLE) +
        '&startdt=' + start.toISOString() +
        '&enddt=' + end.toISOString() +
        '&body=' + encodeURIComponent(DESC) +
        '&location=' + encodeURIComponent(LOCATION);

      // ICS file (Apple Calendar / any app)
      var icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CCO//EN',
        'BEGIN:VEVENT',
        'DTSTART:' + startStr,
        'DTEND:' + endStr,
        RRULE,
        'SUMMARY:' + TITLE,
        'DESCRIPTION:' + DESC.replace(/\n/g, '\\n'),
        'LOCATION:' + LOCATION,
        'URL:' + ZOOM_URL,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      var icsBlob = new Blob([icsContent], { type: 'text/calendar' });
      var icsUrl = URL.createObjectURL(icsBlob);

      // Build button group
      var wrap = document.createElement('div');
      wrap.className = 'calendar-buttons';
      wrap.innerHTML =
        '<span class="calendar-label">Add to Calendar:</span>' +
        '<a href="' + googleUrl + '" target="_blank" rel="noopener" class="calendar-btn calendar-btn--google" title="Google Calendar">Google</a>' +
        '<a href="' + outlookUrl + '" target="_blank" rel="noopener" class="calendar-btn calendar-btn--outlook" title="Outlook Calendar">Outlook</a>' +
        '<a href="' + icsUrl + '" download="compassion-conference.ics" class="calendar-btn calendar-btn--apple" title="Apple Calendar / ICS">Apple / ICS</a>';

      // Insert after the paragraph following this h3
      var nextEl = h3.nextElementSibling;
      while (nextEl && nextEl.tagName === 'P') {
        nextEl = nextEl.nextElementSibling;
      }
      // Insert before the next non-p element (or at end)
      if (nextEl) {
        h3.parentNode.insertBefore(wrap, nextEl);
      } else {
        h3.parentNode.appendChild(wrap);
      }
    });
  }

  // ---- Print ----
  function initPrint() {
    var printBtn = document.querySelector('.toc-btn[onclick*="print"]');
    if (!printBtn) {
      var btns = document.querySelectorAll('.toc-btn');
      btns.forEach(function (b) { if (b.textContent.trim() === 'Print') printBtn = b; });
    }
    if (!printBtn) return;

    printBtn.removeAttribute('onclick');
    printBtn.textContent = 'Print Lesson';

    // The multi-option print dropdown (lesson / lesson+responses /
    // responses-only) was retired along with the journal feature. The
    // button now prints the lesson content directly.
    printBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      runPrint('lesson');
    });

    function getJournalKey(textareaId) {
      var weekId = document.body.getAttribute('data-week') || 'unknown';
      return 'cco-journal-' + weekId + '-' + textareaId;
    }

    function getJournalLabel(textarea) {
      // Walk up to find the closest heading label for this journal entry
      var cur = textarea;
      while (cur && cur !== document.body) {
        // Check parent practice-card first for its h4
        if (cur.classList && cur.classList.contains('practice-card')) {
          var h4 = cur.querySelector('h4');
          if (h4) return h4.textContent.trim();
        }
        // Walk previous siblings looking for headings (not paragraphs)
        var prev = cur.previousElementSibling;
        while (prev) {
          if (/^(H3|H4|LABEL)$/.test(prev.tagName)) {
            var txt = prev.textContent.trim();
            if (txt) return txt;
          }
          prev = prev.previousElementSibling;
        }
        cur = cur.parentElement;
      }
      return 'Journal Entry';
    }

    function runPrint(mode) {
      // Extract all text content from the page into a clean standalone document
      var weekLabel = '';
      var el = document.querySelector('.hero-week-label');
      if (el) weekLabel = el.textContent.trim();

      var title = '';
      el = document.querySelector('.hero h1');
      if (el) title = el.textContent.trim();

      var instructor = '';
      el = document.querySelector('.hero-instructor');
      if (el) instructor = el.textContent.trim();

      // Build sections
      var sectionsHTML = '';
      var includeResponses = (mode === 'both' || mode === 'work');
      var lessonOnly = (mode === 'lesson');
      var responsesOnly = (mode === 'work');
      var anyResponsesFound = false;

      document.querySelectorAll('.section-card').forEach(function (card) {
        // Lesson-content print excludes the "Compassion Course Information"
        // and "Resources" sections — they're reference/admin material, not
        // part of the printable lesson.
        if (lessonOnly && (card.id === 'info' || card.id === 'resources')) return;

        var h2 = card.querySelector('.accordion-header h2');
        if (!h2) return;
        var sectionTitle = h2.textContent.replace(/[▼▲]/g, '').trim();
        // Remove emoji icons from the start
        sectionTitle = sectionTitle.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]+\s*/u, '').trim();

        var content = card.querySelector('.accordion-content');
        if (!content) return;

        // Clone to manipulate without affecting page
        var clone = content.cloneNode(true);

        // Inject journal responses (if requested) BEFORE removal pass
        var sectionHasResponse = false;
        if (includeResponses) {
          clone.querySelectorAll('.journal-area').forEach(function (ta) {
            var saved = localStorage.getItem(getJournalKey(ta.id)) || '';
            if (!saved.trim()) return;
            sectionHasResponse = true;
            anyResponsesFound = true;
            var label = getJournalLabel(ta);
            var resp = document.createElement('div');
            resp.className = 'journal-response-print';
            resp.setAttribute('data-label', label);
            resp.setAttribute('data-value', saved);
            ta.parentNode.insertBefore(resp, ta);
          });
        }

        // Remove UI elements from clone
        var removeSelectors = [
          '.breathing-widget', '.section-read-btn', '.dialogue-controls',
          '.journal-area', '.journal-saved', '.journal-footer', '.copy-btn',
          '.cc-widget', '.cc-done-row',
          '.timer-container', '.calendar-buttons', '.progress-ring-container',
          '.word-count', '.rating-slider-container', '.inline-reference-panel',
          '.inline-ref-trigger', '.celebration-overlay', '.typewriter-cursor',
          '.step-card-number', '.needs-panel', '.feelings-panel'
        ].join(',');
        clone.querySelectorAll(removeSelectors).forEach(function (el) { el.remove(); });

        // For "responses only" mode: strip ALL content except headings and response blocks
        if (responsesOnly) {
          if (!sectionHasResponse) return; // skip sections with no user responses
          // Keep only practice-card wrappers that contain responses, or standalone responses
          // Simplest: replace clone's content with just the response blocks + their labels
          var responses = clone.querySelectorAll('.journal-response-print');
          if (!responses.length) return;
          var newRoot = document.createElement('div');
          responses.forEach(function (r) { newRoot.appendChild(r.cloneNode(true)); });
          clone = newRoot;
        }

        // Make all dialogue lines visible
        clone.querySelectorAll('.dialogue-line, .dialogue-narration').forEach(function (el) {
          el.style.display = 'block';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        });

        // Process the content into clean HTML
        var sectionContent = processContentForPrint(clone);

        // Skip sections with no meaningful content (avoids blank pages)
        var stripped = sectionContent.replace(/<[^>]*>/g, '').trim();
        if (!stripped && !sectionContent.match(/<(table|img|svg|div class="journal-response)/i)) return;

        sectionsHTML += '<div class="print-section">' +
          '<h2>' + escapeHTML(sectionTitle) + '</h2>' +
          sectionContent +
          '</div>';
      });

      if (responsesOnly && !anyResponsesFound) {
        sectionsHTML = '<div class="print-section"><h2>No Responses Yet</h2>' +
          '<p>You haven\'t filled in any journal entries for this week yet. Once you add responses in the practice sections, they will appear here.</p></div>';
      }

      // Build the print document
      var printHTML = buildPrintDocument(weekLabel, title, instructor, sectionsHTML, mode);

      // Print via hidden iframe (no popup)
      var existingFrame = document.getElementById('print-frame');
      if (existingFrame) existingFrame.remove();

      var iframe = document.createElement('iframe');
      iframe.id = 'print-frame';
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
      document.body.appendChild(iframe);

      var iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // Wait for fonts to load then print
      setTimeout(function () {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Clean up after print dialog closes
        setTimeout(function () { iframe.remove(); }, 1000);
      }, 500);
    }
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function processContentForPrint(container) {
    var html = '';

    function walk(el) {
      if (!el) return;
      var children = el.children;
      for (var i = 0; i < children.length; i++) {
        var node = children[i];
        var tag = node.tagName;
        var cls = node.className || '';

        // Skip hidden/removed elements (but not injected journal responses or dialogue lines)
        if (getComputedStyle(node).display === 'none' && !node.classList.contains('dialogue-line') && !node.classList.contains('journal-response-print')) continue;

        if (tag === 'H3') {
          html += '<h3>' + node.innerHTML + '</h3>';
        } else if (tag === 'H4') {
          html += '<h4>' + node.innerHTML + '</h4>';
        } else if (tag === 'P') {
          html += '<p>' + node.innerHTML + '</p>';
        } else if (tag === 'UL') {
          html += '<ul>' + node.innerHTML + '</ul>';
        } else if (tag === 'OL') {
          html += '<ol>' + node.innerHTML + '</ol>';
        } else if (tag === 'BLOCKQUOTE') {
          html += '<blockquote>' + node.innerHTML + '</blockquote>';
        } else if (tag === 'TABLE') {
          html += '<table>' + node.innerHTML + '</table>';
        } else if (cls.indexOf('insight-box') !== -1) {
          html += '<div class="insight-box">' + node.innerHTML + '</div>';
        } else if (cls.indexOf('dialogue-container') !== -1) {
          html += processPrintDialogue(node);
        } else if (cls.indexOf('step-cards') !== -1) {
          html += processPrintSteps(node);
        } else if (cls.indexOf('practice-card') !== -1) {
          html += processPrintPractice(node);
        } else if (cls.indexOf('resource-grid') !== -1) {
          html += processPrintResources(node);
        } else if (cls.indexOf('journal-response-print') !== -1) {
          var label = node.getAttribute('data-label') || 'Journal Entry';
          var value = node.getAttribute('data-value') || '';
          html += '<div class="journal-response">' +
            '<div class="journal-response-label">' + escapeHTML(label) + '</div>' +
            '<div class="journal-response-value">' + escapeHTML(value).replace(/\n/g, '<br>') + '</div>' +
            '</div>';
        } else {
          // Recurse into generic containers
          walk(node);
        }
      }
    }

    walk(container);
    return html;
  }

  function processPrintDialogue(container) {
    var html = '<div class="dialogue">';
    var lines = container.querySelectorAll('.dialogue-line, .dialogue-narration');
    lines.forEach(function (line) {
      if (line.classList.contains('dialogue-narration')) {
        html += '<p class="narration"><em>' + line.textContent.trim() + '</em></p>';
      } else {
        var speaker = line.querySelector('.speaker-name');
        var text = line.querySelector('.speaker-text');
        var speakerName = speaker ? speaker.textContent.trim() : '';
        var speakerText = text ? text.innerHTML : line.textContent.trim();
        var side = line.classList.contains('speaker-b') ? 'self' : 'other';
        html += '<div class="dialogue-line-print ' + side + '">' +
          '<span class="speaker">' + escapeHTML(speakerName) + '</span>' +
          '<span class="speech">' + speakerText + '</span>' +
          '</div>';
      }
    });
    html += '</div>';
    return html;
  }

  function processPrintSteps(container) {
    var html = '';
    var cards = container.querySelectorAll('.step-card');
    cards.forEach(function (card, i) {
      var num = card.querySelector('.step-num');
      var h4 = card.querySelector('h4');
      var p = card.querySelector('p');
      html += '<div class="step-print">' +
        '<div class="step-num-print">' + (num ? num.textContent.trim() : (i + 1)) + '</div>' +
        '<div class="step-body-print">' +
        (h4 ? '<h4>' + h4.innerHTML + '</h4>' : '') +
        (p ? '<p>' + p.innerHTML + '</p>' : '') +
        '</div></div>';
    });
    return html;
  }

  function processPrintPractice(card) {
    var h4 = card.querySelector('h4');
    var paragraphs = card.querySelectorAll('p');
    var responses = card.querySelectorAll('.journal-response-print');
    var html = '<div class="practice-print">';
    if (h4) html += '<h4>' + h4.innerHTML + '</h4>';
    paragraphs.forEach(function (p) { html += '<p>' + p.innerHTML + '</p>'; });
    responses.forEach(function (r) {
      var label = r.getAttribute('data-label') || 'Journal Entry';
      var value = r.getAttribute('data-value') || '';
      html += '<div class="journal-response">' +
        '<div class="journal-response-label">' + escapeHTML(label) + '</div>' +
        '<div class="journal-response-value">' + escapeHTML(value).replace(/\n/g, '<br>') + '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function processPrintResources(grid) {
    var html = '<ul class="resources-print">';
    grid.querySelectorAll('.resource-link').forEach(function (link) {
      var text = link.querySelector('.resource-text');
      var href = link.getAttribute('href') || '';
      var label = text ? text.textContent.trim() : link.textContent.trim();
      html += '<li><a href="' + href + '">' + escapeHTML(label) + '</a></li>';
    });
    html += '</ul>';
    return html;
  }

  function buildPrintDocument(weekLabel, title, instructor, sectionsHTML, mode) {
    var modeLabel = '';
    if (mode === 'work') modeLabel = 'My Responses';
    else if (mode === 'both') modeLabel = 'Lesson + My Responses';
    // The print document's <title> becomes the browser's default "Save as
    // PDF" filename. Build a clean, filename-safe title that leads with the
    // course + week number, e.g. "Compassion Course - Week 13 - Requests".
    // Avoid ':' which is an invalid filename character (gets mangled on
    // Windows/macOS save dialogs).
    var safeWeek = (weekLabel || '').replace(/[:]/g, '').trim();      // "Week 13"
    var safeTitle = (title || '').replace(/[\\/:*?"<>|]/g, '').trim(); // strip fs-illegal chars
    var docTitle = 'Compassion Course - ' + safeWeek +
      (safeTitle ? ' - ' + safeTitle : '') +
      (modeLabel ? ' - ' + modeLabel : '');
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>' + escapeHTML(docTitle) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
      '<style>' +
      '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { font-family: "Inter", "Segoe UI", Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.7; color: #222; max-width: 7in; margin: 0 auto; padding: 0.4in 0; }' +

      /* Header */
      '.print-header { border-bottom: 2.5pt solid #2a7a6e; padding-bottom: 0.3in; margin-bottom: 0.2in; }' +
      '.print-week { display: inline-block; font-size: 8pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #2a7a6e; border: 1.5px solid #2a7a6e; padding: 2px 10px; border-radius: 3px; margin-bottom: 0.15in; }' +
      '.print-title { font-family: "Playfair Display", Georgia, serif; font-size: 22pt; line-height: 1.2; color: #222; margin: 0.08in 0; }' +
      '.print-instructor { font-size: 10pt; color: #666; }' +

      /* Sections */
      '.print-section { page-break-before: always; padding-top: 0.15in; }' +
      '.print-header + .print-section { page-break-before: auto; }' +
      '.print-section:empty { display: none; page-break-before: auto; }' +
      '.print-section h2 { font-family: "Playfair Display", Georgia, serif; font-size: 16pt; color: #2a7a6e; border-bottom: 1px solid #ddd; padding-bottom: 0.06in; margin: 0 0 0.15in; }' +

      /* Typography */
      'h3 { font-family: "Playfair Display", Georgia, serif; font-size: 12pt; color: #333; margin: 0.2in 0 0.08in; }' +
      'h4 { font-size: 10.5pt; font-weight: 700; color: #222; margin: 0.12in 0 0.04in; }' +
      'p { margin: 0.06in 0; }' +
      'ul, ol { margin: 0.08in 0 0.08in 0.3in; }' +
      'li { margin: 0.03in 0; }' +
      'a { color: #2a7a6e; }' +
      'strong { color: #111; }' +
      'em { color: #444; }' +

      /* Blockquote */
      'blockquote { border-left: 3px solid #2a7a6e; margin: 0.1in 0; padding: 0.06in 0 0.06in 0.15in; color: #444; font-style: italic; }' +

      /* Insight box */
      '.insight-box { background: #f9f7f3; border: 1.5pt solid #2a7a6e; padding: 0.12in 0.15in; margin: 0.12in 0; page-break-inside: avoid; position: relative; }' +
      '.insight-box::before { content: "KEY INSIGHT"; display: inline-block; background: #2a7a6e; color: white; font-size: 7pt; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: 2px; margin-bottom: 0.06in; }' +

      /* Dialogues */
      '.dialogue { margin: 0.1in 0; }' +
      '.dialogue-line-print { padding: 0.08in 0.12in; margin-bottom: 0.05in; border-radius: 4px; page-break-inside: avoid; }' +
      '.dialogue-line-print.other { background: #f3f0eb; margin-right: 1in; border-left: 3px solid #c4756e; }' +
      '.dialogue-line-print.self { background: #eef6f4; margin-left: 1in; border-left: 3px solid #2a7a6e; }' +
      '.dialogue-line-print .speaker { display: block; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.02in; }' +
      '.other .speaker { color: #c4756e; }' +
      '.self .speaker { color: #2a7a6e; }' +
      '.dialogue-line-print .speech { font-size: 9.5pt; color: #333; }' +
      '.narration { font-size: 9pt; color: #888; margin: 0.04in 0; padding-left: 0.12in; }' +

      /* Steps */
      '.step-print { display: flex; gap: 0.12in; border-left: 3px solid #2a7a6e; background: #f9f9f9; padding: 0.1in 0.15in; margin: 0.06in 0; page-break-inside: avoid; }' +
      '.step-num-print { font-family: "Playfair Display", Georgia, serif; font-size: 1.3rem; font-weight: 700; color: #2a7a6e; flex-shrink: 0; width: 0.3in; }' +
      '.step-body-print h4 { margin: 0 0 0.03in; }' +
      '.step-body-print p { font-size: 9.5pt; color: #444; margin: 0; }' +

      /* Practice cards */
      '.practice-print { border: 1px solid #e8e0d0; border-left: 3px solid #e8a838; background: #fffdf8; padding: 0.1in 0.12in; margin: 0.08in 0; page-break-inside: avoid; }' +
      '.practice-print h4 { color: #222; margin: 0 0 0.04in; }' +
      '.practice-print p { font-size: 9.5pt; color: #333; margin: 0.03in 0; }' +

      /* Journal responses */
      '.journal-response { border: 1px solid #d8cfbd; border-left: 3px solid #2a7a6e; background: #fbfaf6; padding: 0.1in 0.14in; margin: 0.1in 0; page-break-inside: avoid; }' +
      '.journal-response-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2a7a6e; margin-bottom: 0.05in; }' +
      '.journal-response-value { font-size: 10pt; color: #222; white-space: pre-wrap; line-height: 1.6; }' +

      /* Resources */
      '.resources-print { list-style: none; margin: 0; padding: 0; }' +
      '.resources-print li { padding: 0.03in 0; font-size: 9.5pt; }' +
      '.resources-print a { color: #2a7a6e; text-decoration: underline; }' +

      /* Tables */
      'table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 0.1in 0; page-break-inside: avoid; }' +
      'th, td { border: 1px solid #ccc; padding: 0.05in 0.08in; text-align: left; }' +
      'th { background: #f5f5f5; font-weight: 700; }' +

      /* Page flow */
      '@page { margin: 0.6in 0.7in; }' +
      'h2, h3, h4 { page-break-after: avoid; }' +
      'p, li, blockquote { orphans: 3; widows: 3; }' +
      '@media print { body { padding: 0; } }' +
      '</style></head><body>' +
      '<div class="print-header">' +
      '<div class="print-week">' + escapeHTML(weekLabel) + (modeLabel ? ' &middot; ' + escapeHTML(modeLabel) : '') + '</div>' +
      '<h1 class="print-title">' + escapeHTML(title) + '</h1>' +
      '<p class="print-instructor">' + escapeHTML(instructor) + '</p>' +
      '</div>' +
      sectionsHTML +
      '</body></html>';
  }

  // ---- Init All ----
  document.addEventListener('DOMContentLoaded', function () {
    initProgressBar();
    initDarkMode();
    initAccordions();
    initExpandCollapse();
    initDialogueReveal();
    // Note-taking / progress features retired for the 2026 cohort:
    //   initJournals()        — journal textareas (now hidden via CSS)
    //   initWordCount()       — per-journal word count + copy footer
    //   initSectionRead()     — "Mark as read" buttons + read badges
    //   initProgressRing()    — % ring in the TOC (driven by read state)
    //   initReflectionTimer() — "Reflect: 1/3/5 min" timer per practice
    // The static .journal-area / .cc-widget elements still ship inside the
    // lesson HTML but are hidden by styles.css; not initializing them means
    // no listeners attach and no extra UI (footers, buttons, ring, timer)
    // is built.
    initHighlights();
    initBackToTop();
    initRatingSliders();
    initScrollAnimations();
    initNeedsPanel();
    initFeelingsPanel();
    initBreathingWidget();
    initTypewriterQuotes();
    initStepReveals();
    initNarration();
    initCalendarButtons();

    initPrint();
  });
})();
