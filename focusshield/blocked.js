// FocusShield - Blocked Page Logic
document.addEventListener('DOMContentLoaded', () => {
  const params   = new URLSearchParams(window.location.search);
  const blockedSite = params.get('site') || '';

  // ── 1. SITE BADGE ─────────────────────────────────────────────
  const siteMsg = document.getElementById('site-message');
  if (siteMsg && blockedSite) siteMsg.textContent = `${blockedSite} is blocked`;

  // ── 2. RANDOM QUOTE ───────────────────────────────────────────
  const quotes = [
    "Your focus is your greatest currency. Spend it wisely.",
    "The noise will always be there. The choice to listen is yours.",
    "Distraction is temporary comfort; focus is lasting achievement.",
    "One task. One focus. One step forward.",
    "Silence the digital world to hear your own potential.",
    "You do not need more time; you need more focus.",
    "Every distraction is a request to delay your dreams.",
    "Deep progress is made in quiet moments of concentration.",
    "Guard your attention as if your future depends on it—because it does.",
    "Great things are built in the absence of interruption.",
    "Clarity of mind begins with the refusal of distractions.",
    "A focused hour is worth more than a distracted day.",
    "Choose the satisfaction of completion over the urge to check.",
    "Energy flows where attention goes. Channel it deliberately.",
    "Your goals are waiting on the other side of your focus.",
    "Master your mind, or your notifications will master you.",
    "The best work is done when the world is shut out.",
    "Commit to the present task. Everything else can wait.",
    "Focus is not about forcing attention; it is about releasing distraction.",
    "Build your wall of focus. Let nothing break through."
  ];
  const quoteEl = document.getElementById('quote-text');
  if (quoteEl) quoteEl.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;

  // ── 3. PERSISTENT FOCUS TIMER ─────────────────────────────────
  //
  // Storage key: focusStats  (object keyed by hostname)
  // Per-domain shape:
  //   {
  //     sessionStart : <ms timestamp> | null,  ← when THIS block session began
  //     priorSecs    : <number>,               ← seconds accumulated in older sessions
  //     lastSecs     : <number> | null         ← total seconds of the LAST completed session
  //   }
  //
  // The live display = priorSecs + floor((now - sessionStart) / 1000)
  // On unblock (handled in popup.js): lastSecs = total, priorSecs=0, sessionStart=null

  const STATS_KEY = 'focusStats';
  const domain = blockedSite || 'unknown';

  const timerH       = document.getElementById('timer-h');
  const timerM       = document.getElementById('timer-m');
  const timerS       = document.getElementById('timer-s');
  const lastRow      = document.getElementById('last-session-row');
  const lastValueEl  = document.getElementById('last-session-value');

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatHMS(totalSecs) {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
    if (m > 0) return `${m}m ${pad(s)}s`;
    return `${s}s`;
  }

  function renderTimer(totalSecs) {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (timerH) timerH.textContent = pad(h);
    if (timerM) timerM.textContent = pad(m);
    if (timerS) timerS.textContent = pad(s);
  }

  chrome.storage.local.get(STATS_KEY, (result) => {
    const allStats = result[STATS_KEY] || {};
    const entry = allStats[domain] || { sessionStart: null, priorSecs: 0, lastSecs: null };

    // ── Start session if not already running ──────────────────
    if (!entry.sessionStart) {
      entry.sessionStart = Date.now();
      allStats[domain] = entry;
      chrome.storage.local.set({ [STATS_KEY]: allStats });
    }

    // ── Show "last session" row ───────────────────────────────
    if (lastRow) {
      if (entry.lastSecs !== null && entry.lastSecs > 0) {
        if (lastValueEl) lastValueEl.textContent = formatHMS(entry.lastSecs);
        lastRow.style.display = 'flex';
      } else {
        lastRow.style.display = 'none';
      }
    }

    // ── Live tick ─────────────────────────────────────────────
    function tick() {
      const elapsed = Math.floor((Date.now() - entry.sessionStart) / 1000);
      renderTimer(entry.priorSecs + elapsed);
    }

    tick();
    setInterval(tick, 1000);
  });

  // ── 4. BREATHING RING (4-7-8 pattern) ────────────────────────
  const PHASES = [
    { label: 'Inhale',  duration: 4, fill: true  },
    { label: 'Hold',    duration: 7, fill: null   },
    { label: 'Exhale',  duration: 8, fill: false  }
  ];
  const CIRCUMFERENCE = 251.2; // 2π × 40

  const progressEl = document.getElementById('breathe-progress');
  const phaseEl    = document.getElementById('breathe-phase');
  const countEl    = document.getElementById('breathe-count');

  let phaseIndex     = 0;
  let secondsLeft    = PHASES[0].duration;
  let currentOffset  = CIRCUMFERENCE;

  function applyPhase() {
    const p = PHASES[phaseIndex];
    if (phaseEl) phaseEl.textContent = p.label;
    secondsLeft = p.duration;
    if (countEl) countEl.textContent = secondsLeft;
  }

  function breatheTick() {
    const phase   = PHASES[phaseIndex];
    const total   = phase.duration;
    const elapsed = total - secondsLeft;
    const fraction = elapsed / total;

    if (phase.fill === true)  currentOffset = CIRCUMFERENCE * (1 - fraction);
    else if (phase.fill === false) currentOffset = CIRCUMFERENCE * fraction;

    if (progressEl) progressEl.style.strokeDashoffset = currentOffset;
    if (countEl)    countEl.textContent = secondsLeft;

    secondsLeft--;

    if (secondsLeft < 0) {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      applyPhase();
    }
  }

  applyPhase();
  breatheTick();
  setInterval(breatheTick, 1000);
});
