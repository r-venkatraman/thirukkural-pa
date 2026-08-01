const DATA_URL = 'data/kurals.json';
let currentLang = 'ta';
let kurals = [];

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

function render(kural) {
  const app = document.getElementById('app');
  const tpl = document.getElementById('kural-template');
  app.innerHTML = '';
  const node = tpl.content.cloneNode(true);

  fill(node, 'id', kural.id);
  fill(node, 'paal', currentLang === 'ta' ? kural.paal_ta : kural.paal_en);
  fill(node, 'adhikaram', currentLang === 'ta' ? kural.adhikaram_ta : kural.adhikaram_en);
  fill(node, 'kural_ta', kural.kural_ta);
  fill(node, 'translation_en', kural.translation_en);
  fill(node, 'urai_core_ta', kural.urai_core_ta);
  fill(node, 'urai_full_ta', kural.urai_full_ta);

  app.appendChild(node);

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
}

function setLang(lang) {
  currentLang = lang;
  document.getElementById('btn-ta').classList.toggle('active', lang === 'ta');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.body.classList.toggle('lang-en', lang === 'en');
  if (kurals.length) render(pickTodayKural(kurals));
}

document.getElementById('btn-ta').addEventListener('click', () => setLang('ta'));
document.getElementById('btn-en').addEventListener('click', () => setLang('en'));

fetch(DATA_URL)
  .then(res => res.json())
  .then(data => {
    kurals = data;
    render(pickTodayKural(kurals));
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
