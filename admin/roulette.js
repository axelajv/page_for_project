const STORAGE_KEY = 'kelpy-admin-roulette-names';
const CARD_WIDTH = 160;
const CARD_MARGIN = 6;
const CARD_STEP = CARD_WIDTH + CARD_MARGIN * 2;
const SPIN_DURATION_MS = 4500;

let participants = [];
let history = [];
let isSpinning = false;

const namesInput = document.getElementById('names-input');
const loadBtn = document.getElementById('load-btn');
const clearBtn = document.getElementById('clear-btn');
const spinBtn = document.getElementById('spin-btn');
const respinBtn = document.getElementById('respin-btn');
const removeWinnerBtn = document.getElementById('remove-winner-btn');
const participantCount = document.getElementById('participant-count');
const reelStrip = document.getElementById('reel-strip');
const winnerCard = document.getElementById('winner-card');
const winnerName = document.getElementById('winner-name');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');

function parseNames(text) {
  return text
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

function renderParticipantCount() {
  participantCount.textContent = `${participants.length} participant${participants.length > 1 ? 's' : ''}`;
  spinBtn.disabled = participants.length < 2 || isSpinning;
}

function renderIdleReel() {
  reelStrip.classList.remove('spin-mode');
  reelStrip.style.transition = 'none';
  reelStrip.style.transform = 'none';
  reelStrip.innerHTML = participants
    .slice(0, 12)
    .map((name) => `<div class="reel-card"><span>${escapeHtml(name)}</span></div>`)
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) namesInput.value = saved;
  } catch {
    // tant pis, pas de persistance dans ce cas (navigation privée, etc.)
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, namesInput.value);
  } catch {
    // best-effort
  }
}

function handleLoad() {
  participants = parseNames(namesInput.value);
  saveToStorage();
  winnerCard.classList.remove('show');
  renderParticipantCount();
  renderIdleReel();
}

function handleClear() {
  namesInput.value = '';
  participants = [];
  history = [];
  saveToStorage();
  winnerCard.classList.remove('show');
  historyPanel.style.display = 'none';
  historyList.innerHTML = '';
  renderParticipantCount();
  renderIdleReel();
}

function spin() {
  if (isSpinning || participants.length < 2) return;
  isSpinning = true;
  spinBtn.disabled = true;
  winnerCard.classList.remove('show');

  const winnerIndex = Math.floor(Math.random() * participants.length);
  const winner = participants[winnerIndex];

  // Bande longue de noms aléatoires, le dernier élément est le gagnant.
  const stripLength = 46;
  const strip = [];
  for (let i = 0; i < stripLength - 1; i++) {
    strip.push(participants[Math.floor(Math.random() * participants.length)]);
  }
  strip.push(winner);

  reelStrip.classList.add('spin-mode');
  reelStrip.style.transition = 'none';
  reelStrip.style.transform = 'translateX(0px)';
  reelStrip.innerHTML = strip.map((name) => `<div class="reel-card"><span>${escapeHtml(name)}</span></div>`).join('');

  // Force un reflow pour que le "transition:none" soit bien appliqué avant l'animation.
  // eslint-disable-next-line no-unused-expressions
  reelStrip.offsetHeight;

  const targetOffset = -(strip.length - 1) * CARD_STEP - CARD_STEP / 2;

  requestAnimationFrame(() => {
    reelStrip.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.65, 0.1, 1)`;
    reelStrip.style.transform = `translateX(${targetOffset}px)`;
  });

  setTimeout(() => {
    isSpinning = false;
    winnerName.textContent = winner;
    winnerCard.classList.add('show');
    history.unshift({ name: winner, at: new Date() });
    renderHistory();
    renderParticipantCount();
  }, SPIN_DURATION_MS + 150);
}

function renderHistory() {
  if (history.length === 0) {
    historyPanel.style.display = 'none';
    return;
  }
  historyPanel.style.display = 'block';
  historyList.innerHTML = history
    .map(
      (h) =>
        `<div class="history-row"><span class="history-name">${escapeHtml(h.name)}</span><span class="history-time">${h.at.toLocaleTimeString('fr-FR')}</span></div>`
    )
    .join('');
}

function removeWinnerFromList() {
  const winner = winnerName.textContent;
  participants = participants.filter((n) => n !== winner);
  namesInput.value = participants.join('\n');
  saveToStorage();
  winnerCard.classList.remove('show');
  renderParticipantCount();
  renderIdleReel();
}

loadBtn.addEventListener('click', handleLoad);
clearBtn.addEventListener('click', handleClear);
spinBtn.addEventListener('click', spin);
respinBtn.addEventListener('click', spin);
removeWinnerBtn.addEventListener('click', removeWinnerFromList);

(async function init() {
  const session = await requireAdminSession();
  if (!session) return;
  loadFromStorage();
  handleLoad();
})();
