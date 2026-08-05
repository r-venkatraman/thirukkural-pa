const DATA_URL = 'data/kurals.json';
let currentLang = 'ta';
let currentView = 'today'; // 'today' | 'list' | 'detail'
let kurals = [];
let detailFromList = false;
let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

const LABELS = {
  ta: {
    showCore: 'உரை காட்டு · Show meaning',
    showFull: 'பரிமேலழகர் உரைச் சுருக்கம்',
    coreHeading: 'தெளிவுரை',
    fullHeading: 'பரிமேலழகர் உரை',
    tabToday: 'இன்றைய குறள்',
    tabBrowse: 'அனைத்தும்',
    backToList: '← பட்டியலுக்குத் திரும்பு',
    play: 'ஒலிக்க · Listen',
    playing: 'ஒலிக்கிறது… · Playing…',
    gitaBtn: '🕉 கீதையுடன் ஒப்பிடு',
    gitaHeading: 'கீதையின் ஒப்பீடு',
    shareLabel: 'இக்குறளைப் பகிர்க',
    shareText: (k) => `${k.kural_ta}\n\n"${k.urai_core_ta}"\n— திருக்குறள் ${k.id}, Thirukkural\n\n🕉 கீதை ஒப்புமை: ${k.gita_ref}\n${stripHighlightMarkers(k.gita_verse_ta_script)}\n"${k.gita_verse_meaning_ta}"\n\nhttps://r-venkatraman.github.io/thirukkural-pa/`
  },
  en: {
    showCore: 'Show meaning',
    showFull: 'Full commentary',
    coreHeading: 'Meaning',
    fullHeading: "Parimelazhagar's commentary (translated)",
    tabToday: 'Today',
    tabBrowse: 'Browse All',
    backToList: '← Back to list',
    play: 'Listen',
    playing: 'Playing…',
    gitaBtn: '🕉 Compare with the Gita',
    gitaHeading: 'Bhagavad Gita Parallel',
    shareLabel: 'Share this kural',
    shareText: (k) => `${k.kural_ta}\n\n"${k.translation_en}"\n— Thirukkural ${k.id}\n\n🕉 Bhagavad Gita parallel: ${k.gita_ref}\n${k.gita_verse_translit}\n"${k.gita_verse_en}"\n\nhttps://r-venkatraman.github.io/thirukkural-pa/`
  }
};

function speakText(text, langCodes, onEnd) {
  if (!('speechSynthesis' in window)) {
    alert('Audio is not supported on this browser.');
    if (onEnd) onEnd();
    return;
  }
  const codes = Array.isArray(langCodes) ? langCodes : [langCodes];
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\n/g, ', '));
  const voices = window.speechSynthesis.getVoices();
  let match = null;
  for (const code of codes) {
    match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(code));
    if (match) break;
  }
  if (match) utterance.voice = match;
  utterance.lang = (match && match.lang) || (codes[0] === 'ta' ? 'ta-IN' : 'hi-IN');
  utterance.rate = 0.75;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

function speakTamil(text, onEnd) {
  speakText(text, ['ta'], onEnd);
}

function pickTodayKural(list) {
  const anchor = new Date('2026-01-01T00:00:00');
  const now = new Date();
  const daysSince = Math.floor((now - anchor) / 86400000);
  const index = ((daysSince % list.length) + list.length) % list.length;
  return list[index];
}

function fill(root, field, value) {
  const el = root.querySelector(`[data-field="${field}"]`);
  if (el) el.textContent = value;
}

// Renders text containing ‹...› markers as bold spans (used for highlighting
// the matching phrase within a full Sanskrit/Tamil-script sloka).
function renderWithHighlight(el, text) {
  if (!el || !text) return;
  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = text.split(/[\u2039\u203A]/); // split on ‹ ›
  let html = '';
  parts.forEach((part, i) => {
    const escaped = escapeHtml(part);
    html += (i % 2 === 1) ? `<strong class="gita-highlight">${escaped}</strong>` : escaped;
  });
  el.innerHTML = html;
}

function stripHighlightMarkers(text) {
  return text ? text.replace(/[\u2039\u203A]/g, '') : text;
}

function renderKuralCard(kural, showBack) {
  const app = document.getElementById('app');
  const tpl = document.getElementById('kural-template');
  app.innerHTML = '';
  const node = tpl.content.cloneNode(true);
  const labels = LABELS[currentLang];

  fill(node, 'id', kural.id);
  fill(node, 'paal', currentLang === 'ta' ? kural.paal_ta : kural.paal_en);
  fill(node, 'adhikaram', currentLang === 'ta' ? kural.adhikaram_ta : kural.adhikaram_en);
  fill(node, 'kural_ta', kural.kural_ta);
  fill(node, 'translation_en', kural.translation_en);
  fill(node, 'urai_core', currentLang === 'ta' ? kural.urai_core_ta : kural.urai_core_en);
  fill(node, 'urai_full', currentLang === 'ta' ? kural.urai_full_ta : kural.urai_full_en);
  fill(node, 'gita_ref', kural.gita_ref);
  fill(node, 'gita_verse_translit', kural.gita_verse_translit);
  fill(node, 'gita_verse_en', kural.gita_verse_en);
  fill(node, 'gita_verse_meaning_ta', kural.gita_verse_meaning_ta);

  const gitaTaScript = node.querySelector('[data-field="gita_verse_ta_script"]');
  if (gitaTaScript) {
    if (currentLang === 'ta' && kural.gita_verse_ta_script) {
      renderWithHighlight(gitaTaScript, kural.gita_verse_ta_script);
      gitaTaScript.hidden = false;
    } else {
      gitaTaScript.hidden = true;
    }
  }

  const gitaSaScript = node.querySelector('[data-field="gita_verse_sa_devanagari"]');
  if (gitaSaScript) {
    if (kural.gita_verse_sa_devanagari) {
      renderWithHighlight(gitaSaScript, kural.gita_verse_sa_devanagari);
      gitaSaScript.hidden = false;
    } else {
      gitaSaScript.hidden = true;
    }
  }

  // Roman transliteration and English meaning: English mode only
  const gitaRomanized = node.querySelector('#gita-verse-romanized');
  const gitaMeaningEn = node.querySelector('#gita-meaning-en');
  const gitaMeaningTa = node.querySelector('#gita-meaning-ta');
  if (currentLang === 'ta') {
    if (gitaRomanized) gitaRomanized.hidden = true;
    if (gitaMeaningEn) gitaMeaningEn.hidden = true;
    if (gitaMeaningTa) gitaMeaningTa.hidden = false;
  } else {
    if (gitaRomanized) gitaRomanized.hidden = false;
    if (gitaMeaningEn) gitaMeaningEn.hidden = false;
    if (gitaMeaningTa) gitaMeaningTa.hidden = true;
  }

  fill(node, 'gita_note', currentLang === 'ta' ? kural.gita_parallel_note_ta : kural.gita_parallel_note_en);

  const translit = node.querySelector('[data-field="kural_transliteration"]');
  if (translit) {
    if (currentLang === 'en' && kural.kural_transliteration) {
      translit.textContent = kural.kural_transliteration;
      translit.hidden = false;
    } else {
      translit.hidden = true;
    }
  }

  app.appendChild(node);

  const card = app.querySelector('.kural-card');
  if (card) {
    card.classList.add('card-enter');
  }

  document.getElementById('show-core').textContent = labels.showCore;
  document.getElementById('show-full').textContent = labels.showFull;
  document.getElementById('urai-core-heading').textContent = labels.coreHeading;
  const fullHeadingEl = document.getElementById('urai-full-heading');
  fullHeadingEl.textContent = labels.fullHeading;
  fullHeadingEl.style.display = (currentLang === 'ta') ? 'none' : '';
  document.getElementById('show-gita').textContent = labels.gitaBtn;
  document.getElementById('gita-heading').textContent = labels.gitaHeading;

  const badge = document.getElementById('match-badge');
  const strength = kural.gita_match_strength || 'close';
  const badgeLabels = {
    direct: currentLang === 'ta' ? '🔗 நேரடி ஒப்புமை' : '🔗 Direct parallel',
    close: currentLang === 'ta' ? '≈ நெருங்கிய ஒப்புமை' : '≈ Close parallel',
    thematic: currentLang === 'ta' ? '💭 கருத்தொப்புமை' : '💭 Thematic echo'
  };
  badge.textContent = badgeLabels[strength];
  badge.className = 'match-badge ' + strength;
  document.getElementById('share-label').textContent = labels.shareLabel;

  const coreBlock = document.getElementById('urai-core-block');
  const fullBlock = document.getElementById('urai-full-block');
  const showCoreBtn = document.getElementById('show-core');
  const showFullBtn = document.getElementById('show-full');
  const translationEnBlock = document.getElementById('translation-en-block');

  if (currentLang === 'ta') {
    // Tamil mode: skip the English meaning + reveal button entirely,
    // show தெளிவுரை (core urai) directly in its place.
    if (translationEnBlock) translationEnBlock.hidden = true;
    showCoreBtn.hidden = true;
    coreBlock.hidden = false;
  } else {
    if (translationEnBlock) translationEnBlock.hidden = false;
    showCoreBtn.hidden = false;
    coreBlock.hidden = true;
    showCoreBtn.addEventListener('click', () => {
      coreBlock.hidden = !coreBlock.hidden;
    });
  }

  showFullBtn.addEventListener('click', () => {
    fullBlock.hidden = !fullBlock.hidden;
  });

  // English mode: visually emphasize direct/close Gita parallels
  const gitaBlockEl = document.getElementById('gita-block');
  if (gitaBlockEl) {
    gitaBlockEl.classList.remove('strength-direct', 'strength-close', 'strength-thematic');
    gitaBlockEl.classList.add('strength-' + strength);
  }

  const backBtn = document.getElementById('back-to-list');
  if (showBack) {
    backBtn.hidden = false;
    backBtn.textContent = labels.backToList;
    backBtn.addEventListener('click', () => {
      currentView = 'list';
      renderCurrentView();
    });
  } else {
    backBtn.hidden = true;
  }

  const nextBtn = document.getElementById('next-kural');
  const nextLabel = document.getElementById('next-label');
  const nextKural = kurals.find(x => x.id === kural.id + 1);
  if (showBack && nextKural) {
    nextLabel.textContent = currentLang === 'ta' ? 'அடுத்தது · Next' : 'Next';
    nextBtn.hidden = false;
    nextBtn.addEventListener('click', () => {
      detailFromList = true;
      currentView = 'detail-' + nextKural.id;
      renderKuralCard(nextKural, true);
    });
  } else {
    nextBtn.hidden = true;
  }

  const playBtn = document.getElementById('play-kural');
  const playLabel = document.getElementById('play-label');
  playLabel.textContent = labels.play;
  playBtn.addEventListener('click', () => {
    playBtn.classList.add('playing');
    playLabel.textContent = labels.playing;
    speakTamil(kural.kural_ta, () => {
      playBtn.classList.remove('playing');
      playLabel.textContent = labels.play;
    });
  });

  const gitaBtn = document.getElementById('show-gita');
  const gitaPlayBtn = document.getElementById('play-gita');
  const gitaPlayLabel = document.getElementById('gita-play-label');
  gitaPlayLabel.textContent = currentLang === 'ta' ? 'ஒலிக்க' : 'Listen';
  gitaPlayBtn.addEventListener('click', () => {
    gitaPlayBtn.classList.add('playing');
    const playingLabel = currentLang === 'ta' ? 'ஒலிக்கிறது…' : 'Playing…';
    gitaPlayLabel.textContent = playingLabel;

    let textToSpeak, voiceCodes;
    if (currentLang === 'ta' && kural.gita_verse_ta_script) {
      textToSpeak = stripHighlightMarkers(kural.gita_verse_ta_script);
      voiceCodes = ['ta'];
    } else if (kural.gita_verse_sa_devanagari) {
      textToSpeak = stripHighlightMarkers(kural.gita_verse_sa_devanagari);
      voiceCodes = ['sa', 'hi']; // true Sanskrit voice if it ever exists, else Hindi as closest proxy
    } else {
      textToSpeak = kural.gita_verse_translit;
      voiceCodes = ['en'];
    }

    speakText(textToSpeak, voiceCodes, () => {
      gitaPlayBtn.classList.remove('playing');
      gitaPlayLabel.textContent = currentLang === 'ta' ? 'ஒலிக்க' : 'Listen';
    });
  });

  const gitaBlock = document.getElementById('gita-block');
  gitaBtn.addEventListener('click', () => {
    const isHidden = gitaBlock.hidden;
    gitaBlock.hidden = !isHidden;
    gitaBlock.classList.toggle('card-enter', isHidden);
  });

  const shareBtn = document.getElementById('share-kural');
  shareBtn.addEventListener('click', async () => {
    const text = labels.shareText(kural);
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) { /* user cancelled, ignore */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        shareBtn.querySelector('#share-label').textContent =
          currentLang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied!';
        setTimeout(() => {
          shareBtn.querySelector('#share-label').textContent = labels.shareLabel;
        }, 1800);
      } catch (e) { /* clipboard not available */ }
    }
  });
}

function kuralListItemText(k) {
  return currentLang === 'en'
    ? (k.kural_transliteration ? k.kural_transliteration.replace('\n', ' ') : k.kural_ta.replace('\n', ' '))
    : k.kural_ta.replace('\n', ' ');
}

function buildListItem(k) {
  const tpl = document.getElementById('list-item-template');
  const node = tpl.content.cloneNode(true);
  const btn = node.querySelector('.kural-list-item');
  const num = node.querySelector('.list-item-number');
  const text = node.querySelector('.list-item-text');

  num.textContent = k.id;
  text.textContent = kuralListItemText(k);

  btn.addEventListener('click', () => {
    detailFromList = true;
    currentView = 'detail-' + k.id;
    renderKuralCard(k, true);
  });

  return node;
}

function matchesSearch(k, q) {
  const hay = [
    k.kural_ta, k.kural_transliteration, k.translation_en,
    k.adhikaram_ta, k.adhikaram_en, String(k.id)
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function groupByAdhikaram(list) {
  const groups = [];
  let current = null;
  list.forEach(k => {
    const key = k.adhikaram_ta + '||' + k.adhikaram_en;
    if (!current || current.key !== key) {
      current = { key, adhikaram_ta: k.adhikaram_ta, adhikaram_en: k.adhikaram_en, items: [] };
      groups.push(current);
    }
    current.items.push(k);
  });
  return groups;
}

function buildStatsBar() {
  const bar = document.createElement('div');
  bar.className = 'stats-bar';

  const totalAdhikarams = new Set(kurals.map(k => k.adhikaram_ta)).size;
  const directCount = kurals.filter(k => k.gita_match_strength === 'direct').length;
  const gitaCount = kurals.filter(k => k.gita_ref).length;

  const stats = currentLang === 'ta'
    ? [[kurals.length, 'குறள்கள்'], [totalAdhikarams, 'அதிகாரங்கள்'], [gitaCount, 'கீதை ஒப்புமைகள்'], [directCount, 'நேரடி ஒப்புமைகள்']]
    : [[kurals.length, 'Kurals'], [totalAdhikarams, 'Chapters'], [gitaCount, 'Gita parallels'], [directCount, 'Direct matches']];

  stats.forEach(([num, label]) => {
    const pill = document.createElement('div');
    pill.className = 'stat-pill';
    pill.innerHTML = `<span class="stat-num">${num}</span><span class="stat-label">${label}</span>`;
    bar.appendChild(pill);
  });

  return bar;
}

function buildHighlightsSection() {
  const directs = kurals.filter(k => k.gita_match_strength === 'direct');
  if (directs.length === 0) return null;

  const details = document.createElement('details');
  details.className = 'highlights-group';
  const summary = document.createElement('summary');
  summary.textContent = currentLang === 'ta'
    ? `கீதையுடன் மிகச் சிறந்த ஒப்புமைகள் (${directs.length})`
    : `Strongest Gita Parallels (${directs.length})`;
  details.appendChild(summary);

  const itemsEl = document.createElement('div');
  itemsEl.className = 'highlights-items';
  directs.forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'highlight-item';
    const preview = currentLang === 'ta' ? k.kural_ta.replace('\n', ' ') : k.gita_ref;
    btn.innerHTML = `<span class="hl-num">#${k.id}</span><span>${preview}</span>`;
    btn.addEventListener('click', () => {
      detailFromList = true;
      currentView = 'detail-' + k.id;
      renderKuralCard(k, true);
    });
    itemsEl.appendChild(btn);
  });
  details.appendChild(itemsEl);
  return details;
}

function renderList() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'browse-wrap';

  wrap.appendChild(buildStatsBar());

  const highlights = buildHighlightsSection();
  if (highlights) wrap.appendChild(highlights);

  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'search-input';
  searchInput.placeholder = currentLang === 'ta'
    ? 'குறள் தேட... (எண், சொல்)'
    : 'Search kurals... (number, word, chapter)';
  searchWrap.appendChild(searchInput);
  wrap.appendChild(searchWrap);

  const resultsEl = document.createElement('div');
  resultsEl.className = 'kural-list';
  wrap.appendChild(resultsEl);

  function renderResults(query) {
    resultsEl.innerHTML = '';
    const q = query.trim().toLowerCase();

    if (!q) {
      const groups = groupByAdhikaram(kurals);
      groups.forEach(g => {
        const gtpl = document.getElementById('adhikaram-group-template');
        const gnode = gtpl.content.cloneNode(true);
        const title = gnode.querySelector('.adhikaram-group-title');
        const range = gnode.querySelector('.adhikaram-group-range');
        const itemsEl = gnode.querySelector('.adhikaram-group-items');
        const details = gnode.querySelector('details');

        title.textContent = currentLang === 'ta' ? g.adhikaram_ta : g.adhikaram_en;
        const first = g.items[0].id, last = g.items[g.items.length - 1].id;
        range.textContent = first === last ? `#${first}` : `#${first}\u2013${last}`;
        if (kurals.length <= 10) details.open = true;

        g.items.forEach(k => itemsEl.appendChild(buildListItem(k)));
        resultsEl.appendChild(gnode);
      });
    } else {
      const matches = kurals.filter(k => matchesSearch(k, q));
      if (matches.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'loading';
        empty.textContent = currentLang === 'ta' ? 'பொருந்தும் குறள் இல்லை' : 'No matching kurals found';
        resultsEl.appendChild(empty);
      } else {
        matches.forEach(k => resultsEl.appendChild(buildListItem(k)));
      }
    }
  }

  searchInput.addEventListener('input', () => renderResults(searchInput.value));
  renderResults('');

  app.appendChild(wrap);
}

function renderCurrentView() {
  if (currentView === 'today') {
    detailFromList = false;
    renderKuralCard(pickTodayKural(kurals), false);
  } else if (currentView === 'list') {
    renderList();
  } else if (currentView.startsWith('detail-')) {
    const id = parseInt(currentView.split('-')[1], 10);
    const k = kurals.find(x => x.id === id);
    renderKuralCard(k, true);
  }
}

function setLang(lang) {
  currentLang = lang;
  document.getElementById('btn-ta').classList.toggle('active', lang === 'ta');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.body.classList.toggle('lang-en', lang === 'en');

  const labels = LABELS[lang];
  document.getElementById('tab-today').textContent = labels.tabToday;
  document.getElementById('tab-browse').textContent = labels.tabBrowse;

  if (kurals.length) renderCurrentView();
}

document.getElementById('btn-ta').addEventListener('click', () => setLang('ta'));
document.getElementById('btn-en').addEventListener('click', () => setLang('en'));

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  const toggle = document.getElementById('theme-toggle');
  toggle.setAttribute('aria-checked', theme === 'dark');
  toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  document.querySelector('.theme-toggle-thumb').textContent = theme === 'dark' ? '🌙' : '☀️';

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0B5443' : '#0F6E56');
}

function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem('theme', theme);
}

applyTheme(currentTheme);

document.getElementById('theme-toggle').addEventListener('click', () => {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

if (!localStorage.getItem('theme')) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
  });
}

document.getElementById('tab-today').addEventListener('click', () => {
  currentView = 'today';
  document.getElementById('tab-today').classList.add('active');
  document.getElementById('tab-browse').classList.remove('active');
  renderCurrentView();
});

document.getElementById('tab-browse').addEventListener('click', () => {
  currentView = 'list';
  document.getElementById('tab-browse').classList.add('active');
  document.getElementById('tab-today').classList.remove('active');
  renderCurrentView();
});

fetch(DATA_URL)
  .then(res => res.json())
  .then(data => {
    kurals = data;
    setLang(currentLang);
    renderCurrentView();
  })
  .catch(err => {
    document.getElementById('app').innerHTML =
      '<p class="loading">Could not load kural data. Check that data/kurals.json exists.</p>';
    console.error(err);
  });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(console.error);
  });
}
