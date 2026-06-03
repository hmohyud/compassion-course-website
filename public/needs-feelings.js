/* Builds the optional "Grid" view for the Needs / Feelings pages and wires the
   List / Grid toggle. The grid reuses the words + related-word lists already in
   the static List view (so they're never duplicated) and adds a short
   definition per word, revealed on click. List view works without JS. */
(function () {
  'use strict';

  // Short, plain-language definitions for each primary word.
  var DEFS = {
    // ── Needs ──
    'Autonomy': 'The need to make your own choices and direct your own life — freedom, independence, and room to be yourself.',
    'Connection': 'The need to relate and feel close — to be seen, understood, cared for, and to belong (with others and yourself).',
    'Meaning': 'The need for your life and actions to matter — purpose, growth, contribution, learning, and significance.',
    'Peace': 'The need for inner and outer calm — ease, balance, harmony, and acceptance of what is.',
    'Physical Well-Being': 'The need to care for the body — food, rest, shelter, safety, movement, and touch.',
    'Play': 'The need for joy, fun, and lightness — spontaneity, humor, and delight for their own sake.',
    // ── Feelings: needs met ──
    'Affectionate': 'A warm, tender feeling of caring and closeness toward someone.',
    'Engaged': 'Absorbed and drawn in — your attention and curiosity fully present.',
    'Excited': 'A lively, energized feeling of eager anticipation or stimulation.',
    'Exhilarated': 'An intense, soaring feeling of joy and aliveness.',
    'Grateful': 'A warm sense of thankfulness for something received or appreciated.',
    'Happy': 'A general feeling of pleasure, contentment, and good cheer.',
    'Hopeful': 'A buoyant feeling that something good is possible or on its way.',
    'Inspired': 'Moved and uplifted, with fresh energy or motivation stirred in you.',
    'Peaceful': 'A settled, calm, contented feeling of inner quiet.',
    'Refreshed': 'Restored and renewed, as after rest or relief.',
    // ── Feelings: needs not met ──
    'Anger': 'A hot, energized feeling that rises when something feels wrong or unjust.',
    'Aversion': 'A strong feeling of dislike — wanting to push something away.',
    'Confusion': 'An unsettled feeling of not understanding, or being pulled in different directions.',
    'Disconnection': 'A flat, distant feeling of being cut off from others, yourself, or life.',
    'Disquiet': 'An agitated, uneasy feeling that something is not right.',
    'Embarrassment': 'A self-conscious, exposed feeling about how you appear to others.',
    'Fatigue': 'A depleted, worn-out feeling of low energy.',
    'Fear': 'An alarmed feeling in the face of perceived danger or threat.',
    'Pain': 'A deep ache of hurt — emotional or physical suffering.',
    'Sadness': 'A heavy, low feeling of loss, disappointment, or sorrow.',
    'Tension': 'A tight, on-edge feeling of stress or strain.',
    'Yearning': 'An aching pull of longing for something or someone absent.'
  };

  function buildGrid() {
    var list = document.querySelector('.view-list');
    if (!list || document.querySelector('.view-grid')) return;

    var wrap = document.createElement('div');
    wrap.className = 'view-grid';
    var inner = document.createElement('div');
    inner.className = 'section';
    wrap.appendChild(inner);

    list.querySelectorAll('.grid').forEach(function (g) {
      var cls = g.closest('.feelings-met') ? 'met' : (g.closest('.feelings-unmet') ? 'unmet' : 'needs');
      var groupEl = g.closest('.group');
      var label = groupEl && groupEl.querySelector('.group-label');
      if (label) inner.appendChild(label.cloneNode(true));

      var wg = document.createElement('div');
      wg.className = 'word-grid ' + cls;
      g.querySelectorAll('.card').forEach(function (card) {
        var h = card.querySelector('h3');
        var p = card.querySelector('p');
        if (!h || !p) return;
        var word = h.textContent.trim();
        var syn = p.textContent.trim();
        var def = DEFS[word] || '';

        var d = document.createElement('details');
        d.className = 'word-tile';
        var s = document.createElement('summary');
        s.textContent = word;
        d.appendChild(s);
        var body = document.createElement('div');
        body.className = 'word-body';
        var html = '';
        if (def) html += '<p class="word-def">' + def + '</p>';
        html += '<p class="word-syn"><b>Related words</b>' + escapeHtml(syn) + '</p>';
        body.innerHTML = html;
        d.appendChild(body);
        wg.appendChild(d);
      });
      inner.appendChild(wg);
    });

    list.parentNode.insertBefore(wrap, list.nextSibling);
  }

  function escapeHtml(s) { var t = document.createElement('div'); t.textContent = s; return t.innerHTML; }

  function setView(v) {
    document.body.setAttribute('data-view', v);
    document.querySelectorAll('.viewbar button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === v);
    });
    try { localStorage.setItem('nf-view', v); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildGrid();
    document.querySelectorAll('.viewbar button').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
    });
    var saved;
    try { saved = localStorage.getItem('nf-view'); } catch (e) {}
    setView(saved === 'grid' ? 'grid' : 'list');
  });
})();
