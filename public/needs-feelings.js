/* Builds the optional "Grid" view for the Needs / Feelings pages and wires the
   List / Grid toggle. The grid reuses the words + related-word lists already in
   the static List view (so they're never duplicated) and adds a short
   definition per word, revealed on click. Each related word is itself
   expandable to show its own definition. List view works without JS. */
(function () {
  'use strict';

  // Definitions for the primary (category) words.
  var DEFS = {
    'Autonomy': 'The need to make your own choices and direct your own life — freedom, independence, and room to be yourself.',
    'Connection': 'The need to relate and feel close — to be seen, understood, cared for, and to belong (with others and yourself).',
    'Meaning': 'The need for your life and actions to matter — purpose, growth, contribution, learning, and significance.',
    'Peace': 'The need for inner and outer calm — ease, balance, harmony, and acceptance of what is.',
    'Physical Well-Being': 'The need to care for the body — food, rest, shelter, safety, movement, and touch.',
    'Play': 'The need for joy, fun, and lightness — spontaneity, humor, and delight for their own sake.',
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

  // Definitions for every related word (keys match the lists exactly).
  var WORD_DEFS = {
    'abhorrence': 'a feeling of strong disgust or hatred',
    'absorbed': 'fully focused and engrossed in something',
    'acceptance': 'receiving or embracing something as it is',
    'aching': 'feeling a dull, persistent pain',
    'adventure': 'an exciting or daring experience',
    'affection': 'a gentle feeling of fondness and care',
    'afraid': 'feeling fear or worry',
    'aggravated': 'irritated; made more annoyed',
    'agitated': 'troubled and unable to settle',
    'agony': 'intense physical or mental suffering',
    'air': 'breathable air — the body’s need to breathe',
    'alarmed': 'suddenly frightened or worried',
    'amazed': 'filled with wonder or astonishment',
    'ambivalent': 'having mixed or conflicting feelings',
    'amused': 'finding something funny or entertaining',
    'angry': 'feeling strong displeasure',
    'anguished': 'experiencing severe mental or physical pain',
    'animosity': 'strong hostility toward someone',
    'annoyed': 'mildly irritated',
    'anxious': 'uneasy and worried about what may happen',
    'apathetic': 'feeling no interest, concern, or energy',
    'appalled': 'shocked and dismayed',
    'appreciation': 'recognizing the value of something with gratitude',
    'appreciative': 'feeling or showing gratitude',
    'apprehensive': 'anxious that something bad may happen',
    'ardent': 'passionate and enthusiastic',
    'aroused': 'stirred to strong feeling or excitement',
    'ashamed': 'feeling guilt or embarrassment',
    'authenticity': 'being genuine and true to yourself',
    'awareness': 'noticing and knowing what is happening',
    'baffled': 'confused and unable to understand',
    'balance': 'a steady, even, well-proportioned state',
    'beat': 'completely exhausted (informal)',
    'beauty': 'a quality that delights the senses or spirit',
    'belonging': 'feeling accepted as part of a group',
    'bewildered': 'deeply confused',
    'blissful': 'full of joy and contentment',
    'bored': 'weary from lack of interest',
    'bothered': 'mildly troubled or annoyed',
    'burnt out': 'exhausted from prolonged stress',
    'calm': 'peaceful and free from agitation',
    'care': 'attentive concern for someone’s well-being',
    'celebration': 'joyfully marking something that matters',
    'centered': 'emotionally grounded and balanced',
    'chagrined': 'distressed or embarrassed by a failure',
    'challenge': 'a demanding task that calls on your abilities',
    'cheerful': 'noticeably happy and upbeat',
    'choice': 'the freedom to decide among options',
    'clarity': 'clearness of thought or understanding',
    'closed': 'emotionally shut off or guarded',
    'closeness': 'a feeling of intimacy and connection',
    'comfort': 'ease and freedom from distress',
    'comfortable': 'at ease, free from discomfort',
    'communication': 'sharing and receiving meaning with others',
    'communion': 'a deep sense of shared connection',
    'community': 'a group bound by shared belonging',
    'companionship': 'the comfort of having company',
    'compassion': 'caring concern for another’s suffering',
    'compassionate': 'showing caring concern for others',
    'competence': 'the ability to do something well',
    'concerned': 'worried or caring about something',
    'confident': 'sure of yourself or of an outcome',
    'conflicted': 'torn between opposing feelings',
    'consciousness': 'awareness of yourself and your surroundings',
    'consideration': 'thoughtful regard for others',
    'contempt': 'a feeling that someone is beneath respect',
    'content': 'peacefully satisfied',
    'contribution': 'giving something of value to others',
    'creativity': 'making something new or original',
    'curious': 'eager to learn or know',
    'dazed': 'stunned and unable to think clearly',
    'dazzled': 'overwhelmed with delight or admiration',
    'dejected': 'low in spirits',
    'delighted': 'greatly pleased',
    'depleted': 'drained of energy or resources',
    'depressed': 'deeply low and despondent',
    'despairing': 'feeling that all hope is lost',
    'despondent': 'in low spirits from loss of hope',
    'detached': 'emotionally disconnected',
    'devastated': 'overwhelmed by grief or shock',
    'dignity': 'the sense of being worthy of respect',
    'disappointed': 'let down by unmet hopes',
    'discombobulated': 'confused and thrown off balance',
    'discomfited': 'made uneasy or embarrassed',
    'disconcerted': 'unsettled and thrown off',
    'discouraged': 'having lost confidence or hope',
    'discovery': 'finding or learning something new',
    'disgruntled': 'dissatisfied and resentful',
    'disgust': 'strong distaste or revulsion',
    'disheartened': 'having lost spirit or morale',
    'dislike': 'a feeling of not liking something',
    'dismayed': 'alarmed and discouraged',
    'disoriented': 'confused about where or what you are',
    'displeased': 'annoyed or dissatisfied',
    'distant': 'emotionally remote',
    'distraught': 'deeply upset and agitated',
    'distressed': 'troubled and suffering',
    'disturbed': 'unsettled or agitated',
    'dread': 'deep fear of something to come',
    'eager': 'keenly wanting to do something',
    'ease': 'comfort and freedom from strain',
    'ecstatic': 'overwhelmingly joyful',
    'edgy': 'tense and irritable',
    'effectiveness': 'producing the result you intend',
    'efficiency': 'achieving results with little waste',
    'elated': 'very happy and excited',
    'electrified': 'thrilled and energized',
    'empathy': 'sensing and sharing another’s feelings',
    'enchanted': 'filled with delight, as if under a spell',
    'energetic': 'full of energy',
    'engrossed': 'completely absorbed',
    'enlivened': 'made lively and animated',
    'enmity': 'deep-seated hostility',
    'enraged': 'filled with intense anger',
    'enthralled': 'captivated and fascinated',
    'enthused': 'filled with eager interest',
    'enthusiastic': 'full of eager enjoyment',
    'entranced': 'filled with wonder and delight',
    'equanimity': 'calm steadiness of mind',
    'euphoric': 'intensely happy and elated',
    'exasperated': 'intensely irritated',
    'excitement': 'a lively feeling of eagerness',
    'exhausted': 'drained of all energy',
    'expectant': 'hopefully awaiting something',
    'exuberant': 'full of lively energy and joy',
    'faith': 'trust or confidence in something',
    'fascinated': 'intensely interested',
    'fearful': 'feeling afraid',
    'fidgety': 'restless and unable to keep still',
    'flustered': 'agitated and confused',
    'fond': 'feeling tender affection',
    'food': 'the nourishment the body needs',
    'foreboding': 'a sense that something bad will happen',
    'forlorn': 'lonely and sad',
    'frazzled': 'worn out and frayed by stress',
    'freedom': 'the ability to act without constraint',
    'friendship': 'a bond of mutual affection',
    'frightened': 'afraid',
    'frustrated': 'upset at being blocked from a goal',
    'fulfilled': 'deeply satisfied',
    'fun': 'lighthearted enjoyment',
    'furious': 'extremely angry',
    'giddy': 'dizzy with excitement',
    'glad': 'pleased and happy',
    'gloomy': 'low and dejected',
    'grief': 'deep sorrow, especially from loss',
    'growth': 'developing and becoming more',
    'guarded': 'cautious and self-protective',
    'harmony': 'peaceful agreement and balance',
    'hate': 'intense dislike or hostility',
    'heartbroken': 'overwhelmed by grief',
    'heavyhearted': 'weighed down by sadness',
    'hope': 'the expectation that good is possible',
    'hopeless': 'feeling no hope',
    'horrified': 'filled with horror',
    'hostile': 'unfriendly and antagonistic',
    'humor': 'the quality of being amusing; playfulness',
    'hungry': 'needing food',
    'hurting': 'feeling pain',
    'incensed': 'very angry',
    'inclusion': 'being made part of something',
    'independence': 'not having to rely on others',
    'indifferent': 'without interest or concern',
    'insecure': 'uncertain and lacking confidence',
    'inspiration': 'being moved to create or act',
    'integration': 'bringing parts into a whole',
    'integrity': 'wholeness and alignment with your values',
    'interested': 'wanting to give attention to something',
    'intimacy': 'close personal connection',
    'intrigued': 'curious and fascinated',
    'invigorated': 'filled with fresh energy',
    'involved': 'actively engaged',
    'irate': 'very angry',
    'irked': 'annoyed',
    'irritated': 'feeling annoyed',
    'jazzed': 'excited and eager (informal)',
    'jittery': 'nervous and shaky',
    'jolly': 'cheerful and merry',
    'joy': 'a feeling of great happiness',
    'joyful': 'full of joy',
    'jubilant': 'triumphantly happy',
    'learning': 'gaining knowledge or skill',
    'leery': 'wary and distrustful',
    'lighthearted': 'carefree and cheerful',
    'listless': 'lacking energy or enthusiasm',
    'lively': 'full of energy',
    'livid': 'furiously angry',
    'loathing': 'intense dislike or disgust',
    'lonely': 'sad from being alone or apart',
    'longing': 'a strong yearning',
    'love': 'deep affection and care',
    'loving': 'showing deep affection',
    'melancholy': 'a thoughtful, gentle sadness',
    'mellow': 'relaxed and easygoing',
    'merry': 'cheerful and lively',
    'miffed': 'mildly annoyed',
    'miserable': 'deeply unhappy',
    'mistrustful': 'lacking trust',
    'mixed': 'having conflicting feelings',
    'mortified': 'deeply embarrassed',
    'motivated': 'driven to act',
    'mourning': 'grieving a loss',
    'moved': 'stirred emotionally',
    'movement': 'physical motion — the body’s need to move',
    'movement/exercise': 'the physical activity the body needs',
    'mutuality': 'a give-and-take shared equally',
    'mystified': 'completely puzzled',
    'nervous': 'anxious and on edge',
    'nettled': 'irritated',
    'nostalgic': 'longing for the past',
    'numb': 'feeling little or nothing',
    'nurturing': 'caring for someone’s growth',
    'open': 'receptive and unguarded',
    'openhearted': 'warm and emotionally open',
    'order': 'a sense of structure and arrangement',
    'outraged': 'shocked and angered',
    'overjoyed': 'extremely happy',
    'overwhelmed': 'swamped by too much at once',
    'panicked': 'seized by sudden fear',
    'participation': 'taking part',
    'partnership': 'working together as equals',
    'passionate': 'feeling strong emotion',
    'peace-of-mind': 'a calm, untroubled mind',
    'peeved': 'annoyed',
    'perplexed': 'confused and puzzled',
    'perspective': 'a clear, broader view of things',
    'perturbed': 'troubled and unsettled',
    'petrified': 'paralyzed by fear',
    'pining': 'longing painfully',
    'pleased': 'feeling satisfaction',
    'pooped': 'very tired (informal)',
    'presence': 'being fully here in the moment',
    'progress': 'moving forward toward a goal',
    'psyched': 'excited and ready (informal)',
    'purpose': 'a sense of direction and meaning',
    'puzzled': 'confused',
    'quiet': 'stillness and calm',
    'radiant': 'glowing with joy',
    'rapturous': 'filled with intense delight',
    'rattled': 'shaken and unsettled',
    'recharged': 'restored in energy',
    'regretful': 'feeling sorry about something',
    'rejuvenated': 'made to feel fresh and renewed',
    'relaxation': 'rest and the release of tension',
    'relaxed': 'free from tension',
    'relieved': 'eased after worry or strain',
    'remorseful': 'feeling deep regret',
    'renewed': 'made fresh again',
    'repulsion': 'a strong feeling of being repelled',
    'resentful': 'bitter about being wronged',
    'respect/self-respect': 'regard for the worth of others and of yourself',
    'rest/sleep': 'the rest and sleep the body needs',
    'rested': 'restored by rest',
    'restless': 'unable to be still or content',
    'restored': 'brought back to a good state',
    'revived': 'brought back to energy or life',
    'revulsion': 'a strong feeling of disgust',
    'safety (physical)': 'protection from physical harm',
    'sanguine': 'cheerfully optimistic',
    'satisfied': 'content that a need is met',
    'scared': 'frightened',
    'security': 'a sense of safety and stability',
    'self-acceptance': 'embracing yourself as you are',
    'self-care': 'tending to your own well-being',
    'self-connection': 'being in touch with yourself',
    'self-conscious': 'uneasily aware of how you appear',
    'self-expression': 'showing who you are',
    'serene': 'calm and untroubled',
    'sexual expression': 'expressing your sexuality',
    'shaky': 'trembling, often from fear',
    'shared reality': 'a sense of seeing things together',
    'shelter': 'a safe place to live',
    'shocked': 'stunned by something sudden',
    'sleepy': 'needing sleep',
    'space': 'room to be and to breathe',
    'spellbound': 'held in fascinated attention',
    'spontaneity': 'acting freely in the moment',
    'stability': 'steadiness and dependability',
    'startled': 'suddenly surprised',
    'stimulated': 'enlivened and engaged',
    'stimulation': 'lively input that engages you',
    'stirred': 'emotionally moved',
    'stressed out': 'overwhelmed by pressure',
    'support': 'help and backing from others',
    'surprised': 'caught off guard',
    'tender': 'gentle and caring',
    'terrified': 'extremely afraid',
    'thankful': 'feeling gratitude',
    'thrilled': 'filled with excitement',
    'tickled': 'amused and delighted',
    'tired': 'in need of rest',
    'to know and be known': 'to deeply understand and be understood',
    'to see and be seen': 'to truly perceive and be perceived',
    'torn': 'caught between choices',
    'touch': 'the physical contact the body needs',
    'touched': 'emotionally moved by kindness',
    'tranquil': 'peacefully calm',
    'trepidation': 'nervous fear about what lies ahead',
    'troubled': 'worried and distressed',
    'trust': 'confident reliance on someone',
    'turbulent': 'stormy and unsettled',
    'turmoil': 'a state of great inner disturbance',
    'uncomfortable': 'feeling unease',
    'understanding': 'grasping meaning, and being grasped',
    'uneasy': 'anxious and unsettled',
    'unhappy': 'not happy; sad',
    'unnerved': 'stripped of confidence or calm',
    'unsettled': 'disturbed and not at peace',
    'up': 'in good, positive spirits',
    'upbeat': 'cheerful and optimistic',
    'upset': 'distressed or unhappy',
    'vibrant': 'full of life and energy',
    'warm': 'tender and affectionate',
    'warmth': 'a tender, caring feeling',
    'wary': 'cautious and alert to danger',
    'water': 'the water the body needs',
    'weary': 'very tired',
    'wiped out': 'completely exhausted (informal)',
    'wistful': 'gently longing or yearning',
    'withdrawn': 'pulled back from others',
    'wonder': 'awed admiration and curiosity',
    'worn out': 'exhausted',
    'worried': 'anxious and troubled'
  };

  function escapeHtml(s) { var t = document.createElement('div'); t.textContent = s; return t.innerHTML; }
  function escapeAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function defFor(w) { return WORD_DEFS[w] || WORD_DEFS[w.toLowerCase()] || ''; }

  function synWords(synStr) {
    return synStr.split(',').map(function (w) { return w.trim(); }).filter(Boolean);
  }
  function synList(words) {
    var html = '<div class="word-syn-head">Related words — tap to define</div><div class="word-syn-list">';
    words.forEach(function (w) {
      var def = defFor(w);
      html += '<details class="syn"><summary>' + escapeHtml(w) + '</summary>' +
        '<div class="syn-def">' + (def ? escapeHtml(def) : '&mdash;') + '</div></details>';
    });
    return html + '</div>';
  }

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
        var def = DEFS[word] || '';
        var words = synWords(p.textContent.trim());

        var d = document.createElement('details');
        d.className = 'word-tile';
        var s = document.createElement('summary');
        s.innerHTML = '<span class="wt-word">' + escapeHtml(word) + '</span><span class="wt-count">' + words.length + '</span>';
        d.appendChild(s);
        var body = document.createElement('div');
        body.className = 'word-body';
        body.innerHTML = (def ? '<p class="word-def">' + escapeHtml(def) + '</p>' : '') + synList(words);
        d.appendChild(body);
        wg.appendChild(d);
      });
      inner.appendChild(wg);
    });

    var note = document.createElement('p');
    note.className = 'defs-footnote';
    note.innerHTML = 'Word definitions are brief, plain-language summaries compiled for The Compassion Course, based on common dictionary meanings — they are not quoted from any single source. The feelings &amp; needs word lists themselves are from <a href="https://www.nycnvc.org" target="_blank" rel="noopener">NYCNVC</a>.';
    inner.appendChild(note);

    list.parentNode.insertBefore(wrap, list.nextSibling);
  }

  // List view: wrap each category heading and related word in a hover-to-define term.
  function enhanceList() {
    document.querySelectorAll('.view-list .card').forEach(function (card) {
      var h = card.querySelector('h3');
      if (h && !h.dataset.enhanced) {
        var hw = h.textContent.trim();
        var hd = DEFS[hw];
        if (hd) h.innerHTML = '<span class="term term-head" data-def="' + escapeAttr(hd) + '">' + escapeHtml(hw) + '</span>';
        h.dataset.enhanced = '1';
      }
      var p = card.querySelector('p');
      if (p && !p.dataset.enhanced) {
        var words = synWords(p.textContent);
        p.innerHTML = words.map(function (w) {
          var def = defFor(w);
          return def ? '<span class="term" data-def="' + escapeAttr(def) + '">' + escapeHtml(w) + '</span>' : escapeHtml(w);
        }).join(', ');
        p.dataset.enhanced = '1';
      }
    });
  }

  // A single shared, viewport-clamped tooltip for the .term hovers.
  function initTooltip() {
    var tip = document.createElement('div');
    tip.className = 'nf-tooltip';
    document.body.appendChild(tip);
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest && e.target.closest('.term');
      if (!t || !t.getAttribute('data-def')) return;
      tip.textContent = t.getAttribute('data-def');
      tip.classList.add('show');
      var r = t.getBoundingClientRect();
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var left = r.left + r.width / 2 - tw / 2 + window.scrollX;
      left = Math.max(8 + window.scrollX, Math.min(left, window.scrollX + vw - tw - 8));
      var top = r.top + window.scrollY - th - 10;
      if (r.top - th - 10 < 0) { top = r.bottom + window.scrollY + 10; tip.classList.add('below'); }
      else { tip.classList.remove('below'); }
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('.term')) tip.classList.remove('show');
    });
  }

  function setView(v) {
    document.body.setAttribute('data-view', v);
    document.querySelectorAll('.viewbar button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === v);
    });
    try { localStorage.setItem('nf-view', v); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildGrid();
    enhanceList();
    initTooltip();
    document.querySelectorAll('.viewbar button').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
    });
    var saved;
    try { saved = localStorage.getItem('nf-view'); } catch (e) {}
    setView(saved === 'grid' ? 'grid' : 'list');
  });
})();
