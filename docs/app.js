const DATA_URL = 'data/kurals.json';
let currentLang = 'ta';
let currentView = 'today'; // 'today' | 'list' | 'detail'
let kurals = [];
let detailFromList = false;

const LABELS = {
  ta: {
    showCore: 'உரை காட்டு · Show meaning',
    showFull: 'முழு உரை · Full commentary',
    coreHeading: 'தெளிவுரை',
    fullHeading: 'பரிமேலழகர் உரை',
    tabToday: 'இன்றைய குறள்',
    tabBrowse: 'அனைத்தும்',
    backToList: '← பட்டியலுக்குத் திரும்பு'
  },
  en: {
    showCore: 'Show meaning',
    showFull: 'Full commentary',
    coreHeading: 'Meaning',
    fullHeading: "Parimelazhagar's commentary (translated)",
    tabToday: 'Today',
    tabBrowse: 'Browse All',
    backToList: '← Back to list'
  }
};

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

  document.getElementById('show-core').textContent = labels.showCore;
  document.getElementById('show-full').textContent = labels.showFull;
  document.getElementById('urai-core-heading').textContent = labels.coreHeading;
  document.getElementById('urai-full-heading').textContent = labels.fullHeading;

  const coreBlock = document.getElementById('urai-core-block');
  const fullBlock = document.getElementById('urai-full-block');
  const showCoreBtn = document.getElementById('show-core');
  const showFullBtn = document.getElementById('show-full');

  showCoreBtn.addEventListener('click', () => {
    coreBlock.hidden = false;
    showCoreBtn.hidden = true;
  });
  showFullBtn.addEventListener('click', () => {
    fullBlock.hidden = false;
    showFullBtn.hidden = true;
  });

  const backBtn = document.getElementById('back-to-list');
  if (showBack) {
    backBtn.hidden = false;
    backBtn.textContent = labels.backToList;
    backBtn.addEventListener('click', () => {
      currentView = 'list';
      renderCurrentView();
    });
  }
}

function renderList() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const listEl = document.createElement('div');
  listEl.className = 'kural-list';

  kurals.forEach(k => {
    const tpl = document.getElementById('list-item-template');
    const node = tpl.content.cloneNode(true);
    const btn = node.querySelector('.kural-list-item');
    const num = node.querySelector('.list-item-number');
    const text = node.querySelector('.list-item-text');

    num.textContent = k.id;
    text.textContent = k.kural_ta.replace('\n', ' ');

    btn.addEventListener('click', () => {
      detailFromList = true;
      currentView = 'detail-' + k.id;
      renderKuralCard(k, true);
    });

    listEl.appendChild(node);
  });

  app.appendChild(listEl);
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
