const STORAGE_KEY = 'kelpy-admin-roulette-names';
const SLICE_COLORS = ['#2F7FD1', '#2FA88A', '#E8A94C', '#1B4E80', '#1C6E58', '#9C6A1E'];
const LABEL_RADIUS = 185;
const SPIN_DURATION_MS = 5000;
const MIN_FULL_SPINS = 6;
const MAX_FULL_SPINS = 9;

let participants = [];
let history = [];
let isSpinning = false;
let currentRotation = 0;

const namesInput = document.getElementById('names-input');
const loadBtn = document.getElementById('load-btn');
const clearBtn = document.getElementById('clear-btn');
const spinBtn = document.getElementById('spin-btn');
const respinBtn = document.getElementById('respin-btn');
const removeWinnerBtn = document.getElementById('remove-winner-btn');
const participantCount = document.getElementById('participant-count');
const wheel = document.getElementById('wheel');
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderParticipantCount() {
  participantCount.textContent = `${participants.length} participant${participants.length > 1 ? 's' : ''}`;
  spinBtn.disabled = participants.length < 2 || isSpinning;
}

/** Dessine les parts (conic-gradient) + les étiquettes de noms autour de la roue. */
function renderWheel() {
  wheel.style.transition = 'none';
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  const n = participants.length;
  if (n === 0) {
    wheel.style.background = 'var(--foam-2)';
    wheel.innerHTML = '';
    return;
  }

  const sliceAngle = 360 / n;
  const stops = participants
    .map((_, i) => {
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      return `${color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`;
    })
    .join(', ');
  wheel.style.background = `conic-gradient(${stops})`;

  wheel.innerHTML = participants
    .map((name, i) => {
      const angle = i * sliceAngle + sliceAngle / 2;
      return `<div class="wheel-label" style="transform:rotate(${angle}deg) translateY(-${LABEL_RADIUS}px) rotate(${-angle}deg);"><span>${escapeHtml(name)}</span></div>`;
    })
    .join('');
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
  currentRotation = 0;
  renderParticipantCount();
  renderWheel();
}

function handleClear() {
  namesInput.value = '';
  participants = [];
  history = [];
  saveToStorage();
  winnerCard.classList.remove('show');
  historyPanel.style.display = 'none';
  historyList.innerHTML = '';
  currentRotation = 0;
  renderParticipantCount();
  renderWheel();
}

function spin(forcedWinnerName) {
  if (isSpinning || participants.length < 2) return;
  isSpinning = true;
  spinBtn.disabled = true;
  winnerCard.classList.remove('show');

  const n = participants.length;
  const sliceAngle = 360 / n;
  const forcedIndex = forcedWinnerName ? participants.indexOf(forcedWinnerName) : -1;
  const winnerIndex = forcedIndex >= 0 ? forcedIndex : Math.floor(Math.random() * n);
  const winner = participants[winnerIndex];

  // La pointe fixe est en haut (0deg). Pour amener le centre de la part du gagnant sous la
  // pointe, il faut annuler son angle, plus plusieurs tours complets pour l'effet, plus un petit
  // décalage aléatoire à l'intérieur de la part pour ne jamais retomber pile au même endroit.
  const centerAngle = winnerIndex * sliceAngle + sliceAngle / 2;
  const jitter = (Math.random() - 0.5) * sliceAngle * 0.7;
  const fullSpins = MIN_FULL_SPINS + Math.floor(Math.random() * (MAX_FULL_SPINS - MIN_FULL_SPINS + 1));
  const targetRotation = currentRotation + fullSpins * 360 + (360 - centerAngle + jitter - (currentRotation % 360));

  wheel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.1, 0.6, 0.15, 1)`;
  wheel.style.transform = `rotate(${targetRotation}deg)`;
  currentRotation = targetRotation;

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
  currentRotation = 0;
  renderParticipantCount();
  renderWheel();
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

// Hook de test, console uniquement (pas de bouton dans l'UI) : __kelpyTestSpin('a2h')
// force la roue à tomber sur ce pseudo pour vérifier l'animation. N'affecte jamais
// un tirage lancé normalement via le bouton "Lancer le tirage".
window.__kelpyTestSpin = function (handle) {
  spin(handle);
};
