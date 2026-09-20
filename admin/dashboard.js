const LEVEL_LABELS = {
  decouverte: 'Découverte',
  progresse: 'Je progresse',
  a_l_aise: "À l'aise",
  confirme: 'Confirmé',
};
const LEVEL_COLORS = {
  decouverte: '#E8A94C',
  progresse: '#2FA88A',
  a_l_aise: '#2F7FD1',
  confirme: '#94A3AB',
};

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

let activityMode = 'today'; // 'today' | '7d' | '30d' | 'date'
let selectedDate = null;
let calendarViewDate = new Date();

function periodRange() {
  const now = new Date();
  if (activityMode === 'today') return { from: startOfDay(now), to: addDays(startOfDay(now), 1), sparkDays: 7, sparkEnd: addDays(startOfDay(now), 1) };
  if (activityMode === '30d') return { from: addDays(startOfDay(now), -30), to: now, sparkDays: 30, sparkEnd: now };
  if (activityMode === 'date') {
    const from = startOfDay(selectedDate);
    const to = addDays(from, 1);
    return { from, to, sparkDays: 7, sparkEnd: to };
  }
  return { from: addDays(startOfDay(now), -7), to: now, sparkDays: 7, sparkEnd: now };
}

function formatShortDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function renderBars(containerId, buckets, dates, color) {
  const container = document.getElementById(containerId);
  const max = Math.max(1, ...buckets);
  container.innerHTML = buckets
    .map((v, i) => {
      const height = Math.max(4, (v / max) * 100);
      const barColor = v > 0 ? `background:${color};` : '';
      return `<div class="mini-bar-col">
        <div class="mini-bar-track"><div class="mini-bar" style="height:${height}%; ${barColor}" title="${v}"></div></div>
        <span class="mini-bar-label">${formatShortDate(dates[i])}</span>
      </div>`;
    })
    .join('');
}

async function loadActivity() {
  const { from, to, sparkDays, sparkEnd } = periodRange();
  const sparkStart = addDays(startOfDay(sparkEnd), -sparkDays);
  const dates = Array.from({ length: sparkDays }, (_, i) => addDays(sparkStart, i));

  const [signups, checks, sessions, spots, recos, signupBars, checkBars, sessionBars, spotBars, recoBars] =
    await Promise.all([
      countInRange('profiles', from, to, true),
      countInRange('checks', from, to, false),
      countInRange('sessions_posted', from, to, false),
      countInRange('spots', from, to, false),
      countInRange('analytics_events', from, to, false, 'recommendation_launch'),
      dailyCounts('profiles', sparkEnd, sparkDays, true),
      dailyCounts('checks', sparkEnd, sparkDays, false),
      dailyCounts('sessions_posted', sparkEnd, sparkDays, false),
      dailyCounts('spots', sparkEnd, sparkDays, false),
      dailyCounts('analytics_events', sparkEnd, sparkDays, false, 'recommendation_launch'),
    ]);

  document.getElementById('signups-n').textContent = signups;
  document.getElementById('checks-n').textContent = checks;
  document.getElementById('sessions-n').textContent = sessions;
  document.getElementById('spots-n').textContent = spots;
  document.getElementById('reco-n').textContent = recos;
  renderBars('signups-bars', signupBars, dates, '#2F7FD1');
  renderBars('checks-bars', checkBars, dates, '#2FA88A');
  renderBars('sessions-bars', sessionBars, dates, '#E8A94C');
  renderBars('spots-bars', spotBars, dates, '#875C3C');
  renderBars('reco-bars', recoBars, dates, '#1B4E80');
}

function setActivityMode(mode) {
  activityMode = mode;
  document.querySelectorAll('.period-tab').forEach((el) => el.classList.toggle('active', el.dataset.period === mode));
  document.getElementById('date-btn').textContent = '📅 Choisir une date';
  document.getElementById('calendar').classList.remove('open');
  loadActivity().catch(console.error);
}

function renderCalendar() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  document.getElementById('cal-month').textContent = `${MONTH_NAMES[month]} ${year}`;

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = startOfDay(new Date());

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - startWeekday - daysInMonth + 1, muted: true });
  }

  const dow = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span class="cal-dow">${d}</span>`).join('');
  const dayCells = cells
    .map((c) => {
      if (c.muted) return `<span class="cal-day muted">${c.day}</span>`;
      const isToday = c.date.getTime() === today.getTime();
      const isSelected = selectedDate && c.date.getTime() === startOfDay(selectedDate).getTime();
      const classes = ['cal-day'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('selected');
      return `<button class="${classes.join(' ')}" data-date="${c.date.toISOString()}">${c.day}</button>`;
    })
    .join('');

  document.getElementById('cal-grid').innerHTML = dow + dayCells;
  document.getElementById('cal-grid').querySelectorAll('.cal-day:not(.muted)').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedDate = new Date(btn.dataset.date);
      activityMode = 'date';
      document.querySelectorAll('.period-tab').forEach((el) => el.classList.remove('active'));
      document.getElementById('date-btn').textContent = `📅 ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()].slice(0, 3).toLowerCase()}. ${selectedDate.getFullYear()}`;
      document.getElementById('calendar').classList.remove('open');
      loadActivity().catch(console.error);
    });
  });
}

function renderDonut(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const svg = document.getElementById('donut');
  const legend = document.getElementById('donut-legend');
  if (total === 0) {
    svg.innerHTML = '<circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#EDEAE0" stroke-width="6"></circle>';
    legend.innerHTML = '<p class="empty-note">Pas encore de données</p>';
    return;
  }

  let offset = 0;
  const circles = ['<circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#EDEAE0" stroke-width="6"></circle>'];
  const legendRows = [];
  for (const key of Object.keys(LEVEL_LABELS)) {
    const n = counts[key] || 0;
    if (n === 0) continue;
    const pct = (n / total) * 100;
    circles.push(
      `<circle cx="21" cy="21" r="15.9" fill="transparent" stroke="${LEVEL_COLORS[key]}" stroke-width="6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - offset}" transform="rotate(-90 21 21)"></circle>`
    );
    offset += pct;
    legendRows.push(
      `<div class="legend-row"><span class="sw" style="background:${LEVEL_COLORS[key]};"></span>${LEVEL_LABELS[key]} · ${Math.round(pct)}%</div>`
    );
  }
  svg.innerHTML = circles.join('');
  legend.innerHTML = legendRows.join('');
}

async function loadOverview() {
  const [{ count: totalAccounts }, levelRows, { count: flaggedCount }, { count: totalSpots }] = await Promise.all([
    supabaseClient.from('profiles').select('id', { count: 'exact', head: true }).eq('is_test_account', false),
    supabaseClient.from('profiles').select('level').eq('is_test_account', false),
    supabaseClient.from('spots').select('id', { count: 'exact', head: true }).not('flagged_reason', 'is', null),
    supabaseClient.from('spots').select('id', { count: 'exact', head: true }),
  ]);

  document.getElementById('total-accounts').textContent = totalAccounts ?? 0;
  document.getElementById('total-spots').textContent = totalSpots ?? 0;

  const counts = {};
  for (const row of levelRows.data ?? []) {
    if (!row.level) continue;
    counts[row.level] = (counts[row.level] || 0) + 1;
  }
  renderDonut(counts);

  const spotsTitle = document.getElementById('spots-alert-title');
  spotsTitle.textContent = flaggedCount === 0 ? '0 spot à vérifier' : `${flaggedCount} spot${flaggedCount > 1 ? 's' : ''} à vérifier`;
  document.getElementById('spots-alert').classList.toggle('warn', (flaggedCount ?? 0) > 0);

  try {
    const [checks, users, spots] = await Promise.all([
      supabaseClient.functions.invoke('moderation', { body: { action: 'list' } }),
      supabaseClient.functions.invoke('moderation', { body: { action: 'list_user_reports' } }),
      supabaseClient.functions.invoke('moderation', { body: { action: 'list_spot_submissions' } }),
    ]);
    const total = (checks.data?.reports?.length ?? 0) + (users.data?.reports?.length ?? 0) + (spots.data?.submissions?.length ?? 0);
    const modTitle = document.getElementById('moderation-alert-title');
    modTitle.textContent = total === 0 ? '0 élément en modération' : `${total} élément${total > 1 ? 's' : ''} en modération`;
    document.getElementById('moderation-alert').classList.toggle('warn', total > 0);
  } catch (e) {
    document.getElementById('moderation-alert-title').textContent = 'Modération : erreur de chargement';
  }
}

(async function init() {
  const session = await requireAdminSession();
  if (!session) return;

  document.querySelectorAll('.period-tab').forEach((btn) => {
    btn.addEventListener('click', () => setActivityMode(btn.dataset.period));
  });

  document.getElementById('date-btn').addEventListener('click', () => {
    calendarViewDate = selectedDate ? new Date(selectedDate) : new Date();
    renderCalendar();
    document.getElementById('calendar').classList.toggle('open');
  });
  document.getElementById('cal-prev').addEventListener('click', () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('cal-clear').addEventListener('click', () => {
    selectedDate = null;
    setActivityMode('7d');
  });

  await Promise.all([loadActivity(), loadOverview()]);
})();
