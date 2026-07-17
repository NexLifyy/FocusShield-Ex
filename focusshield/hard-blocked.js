// FocusShield - Hard Block Page Logic
document.addEventListener('DOMContentLoaded', () => {

  const params      = new URLSearchParams(window.location.search);
  const blockedSite = params.get('site') || '';
  let expiresAt   = parseInt(params.get('expiresAt') || '0', 10);
  if (!expiresAt || isNaN(expiresAt)) {
    expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour default
  }
  const originalUrl = params.get('originalUrl') || ('https://' + blockedSite);

  const isFilterType = params.get('type') === 'filter';
  const isSubFeatureType = params.get('type') === 'subfeature';
  const targetDomain = params.get('domain') || '';

  const TEMP_UNLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  function addFilterBypass(domain, callback) {
    chrome.storage.local.get(['filterBypasses', 'focusStats'], (result) => {
      let bypasses = result.filterBypasses || {};
      bypasses[domain] = Date.now() + 10 * 60 * 1000; // 10 mins bypass

      let stats = result.focusStats;
      if (stats) {
        // Subtract 5 minutes for category block when unlocked by challenge!
        stats.timeSavedMinutes = Math.max(0, (stats.timeSavedMinutes || 0) - 5);

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (!stats.dailyLogs) stats.dailyLogs = {};
        if (stats.dailyLogs[todayStr]) {
          const log = stats.dailyLogs[todayStr];
          log.minutes = Math.max(0, (log.minutes || 0) - 5);
        }
      }

      chrome.storage.local.set({ 
        filterBypasses: bypasses,
        focusStats: stats
      }, () => {
        if (callback) callback();
      });
    });
  }  // ── 1. SITE BADGE ──────────────────────────────────────────────
  const siteMsg = document.getElementById('site-message');
  if (siteMsg && blockedSite) {
    if (isFilterType) {
      siteMsg.textContent = `Blocked by ${blockedSite}`;
      const subtext = document.getElementById('subtext-message');
      if (subtext) {
        subtext.innerHTML = `You enabled the <strong>${blockedSite}</strong> filter to stay focused.<br>Stay dedicated to your focus session, you got this 👊`;
      }
    } else {
      siteMsg.textContent = `${blockedSite} is blocked`;
    }
  }

  function removeHardBlock(domain, callback) {
    chrome.storage.local.get(null, (result) => {
      const sites   = result.hardBlockedSites || [];
      const targetClean = domain.toLowerCase().replace(/^www\./, '');
      
      const entry = sites.find(s => s.domain.toLowerCase().replace(/^www\./, '') === targetClean);
      if (entry) {
        const remaining = entry.expiresAt - Date.now();
        let minsToSubtract = 0;
        if (entry.expiresAt > 9000000000000) {
          minsToSubtract = 60;
        } else if (remaining > 0) {
          minsToSubtract = Math.round(remaining / 60000);
        }

        if (minsToSubtract > 0) {
          if (!result.focusStats) {
            result.focusStats = {
              streakDays: 0,
              lastActiveDate: '',
              totalSessionsCompleted: 0,
              timeSavedMinutes: 0,
              siteBlockCounts: {},
              dailyLogs: {},
              dailyFocusGoal: 4
            };
          }
          result.focusStats.timeSavedMinutes = Math.max(0, (result.focusStats.timeSavedMinutes || 0) - minsToSubtract);
          
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          if (!result.focusStats.dailyLogs) result.focusStats.dailyLogs = {};
          if (result.focusStats.dailyLogs[todayStr]) {
            const log = result.focusStats.dailyLogs[todayStr];
            log.minutes = Math.max(0, (log.minutes || 0) - minsToSubtract);
          }
        }
      }

      const updatedSites = sites.filter(s => s.domain.toLowerCase().replace(/^www\./, '') !== targetClean);

      // Disable platform sub-features and master blockFullSite if matching path/domain
      const p = domain.toLowerCase();
      const platforms = ['youtube', 'facebook', 'instagram', 'reddit', 'tiktok', 'twitter'];
      platforms.forEach(plat => {
        if (p.includes(plat)) {
          if (result[plat]) {
            result[plat].blockFullSite = false;
            result[plat].enabled = false;
          }
        }
      });

      if (p.includes('youtube.com/shorts')) {
        if (result.youtube) result.youtube.shorts = false;
      } else if (p.includes('facebook.com/reels')) {
        if (result.facebook) result.facebook.reels = false;
      } else if (p.includes('facebook.com/messages') || p.includes('messenger.com')) {
        if (result.facebook) result.facebook.messenger = false;
      } else if (p.includes('facebook.com/friends')) {
        if (result.facebook) result.facebook.friends = false;
      } else if (p.includes('facebook.com/groups')) {
        if (result.facebook) result.facebook.groups = false;
      } else if (p.includes('facebook.com/pages')) {
        if (result.facebook) result.facebook.pages = false;
      } else if (p.includes('x.com/messages') || p.includes('twitter.com/messages')) {
        if (result.twitter) result.twitter.messages = false;
      } else if (p.includes('x.com/explore') || p.includes('twitter.com/explore')) {
        if (result.twitter) {
          result.twitter.explore = false;
          result.twitter.feed = false;
        }
      } else if (p.includes('instagram.com/reels')) {
        if (result.instagram) result.instagram.reels = false;
      } else if (p.includes('instagram.com/explore')) {
        if (result.instagram) result.instagram.explore = false;
      } else if (p.includes('instagram.com/shop')) {
        if (result.instagram) result.instagram.shopping = false;
      } else if (p.includes('instagram.com/direct')) {
        if (result.instagram) result.instagram.messages = false;
      } else if (p.includes('instagram.com/stories')) {
        if (result.instagram) result.instagram.stories = false;
      } else if (p.includes('reddit.com/r/popular') || p.includes('reddit.com/r/all') || p.includes('reddit.com/news') || p.includes('reddit.com/explore')) {
        if (result.reddit) result.reddit.popularAll = false;
      } else if (p.includes('reddit.com/chat') || p.includes('chat.reddit.com')) {
        if (result.reddit) result.reddit.chatDMs = false;
      } else if (p.includes('tiktok.com/foryou')) {
        if (result.tiktok) result.tiktok.foryou = false;
      } else if (p.includes('tiktok.com/following')) {
        if (result.tiktok) result.tiktok.following = false;
      } else if (p.includes('tiktok.com/live')) {
        if (result.tiktok) result.tiktok.live = false;
      } else if (p.includes('tiktok.com/shop')) {
        if (result.tiktok) result.tiktok.shop = false;
      } else if (p.includes('tiktok.com/search')) {
        if (result.tiktok) result.tiktok.search = false;
      } else if (p.includes('tiktok.com/upload')) {
        if (result.tiktok) result.tiktok.upload = false;
      }

      // Turn off custom sites toggle switches
      if (result.customSites) {
        result.customSites.forEach(s => {
          if (s.domain.toLowerCase().replace(/^www\./, '') === targetClean) {
            s.enabled = false;
          }
        });
      }

      result.hardBlockedSites = updatedSites;

      chrome.storage.local.set(result, () => {
        // Broadcast settings changes to other tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(t => {
            if (t.id) {
              chrome.tabs.sendMessage(t.id, { type: 'SETTINGS_UPDATED', settings: result }).catch(() => {});
            }
          });
        });
        if (callback) callback();
      });
    });
  }

  // ── 3. COUNTDOWN TIMER ─────────────────────────────────────────
  const cdH = document.getElementById('cd-h');
  const cdM = document.getElementById('cd-m');
  const cdS = document.getElementById('cd-s');

  function pad(n) { return String(n).padStart(2, '0'); }

  let countdownInterval = null;

  function startCountdown() {
    function tick() {
      if (expiresAt > 9000000000000) {
        const cdDisplay = document.querySelector('.countdown-display');
        if (cdDisplay) {
          cdDisplay.innerHTML = `
            <div style="font-size: 56px; font-weight: 800; color: var(--accent); line-height: 60px; height: 60px; margin: 0; transform: scale(1.85); transform-origin: center; text-shadow: 0 0 36px rgba(61, 220, 132, 0.7); display: flex; align-items: center; justify-content: center;">
              ∞
            </div>
          `;
        }
        const label = document.querySelector('.countdown-label');
        if (label) label.textContent = 'Site is blocked indefinitely';

        const subtext = document.getElementById('subtext-message');
        if (subtext) {
          subtext.innerHTML = 'You chose to block this site to protect your focus and deep work.<br>Stay dedicated since there is no timer end, you got this 👊';
        }

        const unlockBtnText = document.getElementById('unlock-btn-text');
        if (unlockBtnText) {
          unlockBtnText.textContent = 'Complete Challenges to Unlock';
        }

        const dividerText = document.getElementById('divider-text');
        if (dividerText) {
          dividerText.textContent = 'or unlock site';
        }
        return;
      }

      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        if (cdH) cdH.textContent = '00';
        if (cdM) cdM.textContent = '00';
        if (cdS) cdS.textContent = '00';
        // Timer expired — remove hard block and go
        removeHardBlock(blockedSite, () => {
          window.location.href = originalUrl;
        });
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      if (cdH) cdH.textContent = pad(h);
      if (cdM) cdM.textContent = pad(m);
      if (cdS) cdS.textContent = pad(s);
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  const isScheduleType = params.get('type') === 'schedule';

  if (isFilterType) {
    const cdCard = document.getElementById('countdown-card');
    if (cdCard) cdCard.style.display = 'none';

    const schedCard = document.getElementById('schedule-details-card');
    if (schedCard) {
      schedCard.style.display = 'block';
      const label = schedCard.querySelector('.countdown-label');
      if (label) label.textContent = 'Site is blocked by a Filter';
      const heading = document.getElementById('schedule-time-range');
      if (heading) {
        heading.textContent = blockedSite;
        heading.style.color = 'var(--accent)';
      }
      const days = document.getElementById('schedule-days-list');
      if (days) days.textContent = 'Unlock this domain for 10 minutes by completing the challenges below.';
    }

    const dividerText = document.getElementById('divider-text');
    if (dividerText) dividerText.textContent = 'unlock site';
  } else if (isSubFeatureType) {
    // Hide countdown, divider, unlock button
    const cdCard = document.getElementById('countdown-card');
    if (cdCard) cdCard.style.display = 'none';

    const divider = document.querySelector('.section-divider');
    if (divider) divider.style.display = 'none';

    const unlockBtn = document.getElementById('unlock-early-btn');
    if (unlockBtn) unlockBtn.style.display = 'none';

    const schedCard = document.getElementById('schedule-details-card');
    if (schedCard) {
      schedCard.style.display = 'block';
      const label = schedCard.querySelector('.countdown-label');
      if (label) label.textContent = 'Feature is Blocked';
      const heading = document.getElementById('schedule-time-range');
      if (heading) {
        heading.textContent = blockedSite;
        heading.style.color = 'var(--accent)';
      }
      const days = document.getElementById('schedule-days-list');
      if (days) days.textContent = 'This feature is blocked by your FocusShield settings.';
    }
  } else if (isScheduleType) {
    // Hide countdown, divider, unlock button
    const cdCard = document.getElementById('countdown-card');
    if (cdCard) cdCard.style.display = 'none';

    const divider = document.querySelector('.section-divider');
    if (divider) divider.style.display = 'none';

    const unlockBtn = document.getElementById('unlock-early-btn');
    if (unlockBtn) unlockBtn.style.display = 'none';

    // Show schedule details card & standalone circle widget
    const schedCard = document.getElementById('schedule-details-card');
    if (schedCard) schedCard.style.display = 'block';

    const circleWidget = document.getElementById('schedule-circle-widget');
    if (circleWidget) circleWidget.style.display = 'flex';

    function format12Hour(time24) {
      if (!time24) return '';
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    }

    const startTime = params.get('startTime') || '09:00';
    const endTime = params.get('endTime') || '17:00';
    const timeRangeEl = document.getElementById('schedule-time-range');
    if (timeRangeEl) timeRangeEl.textContent = `${format12Hour(startTime)} - ${format12Hour(endTime)}`;

    const daysParam = params.get('days') || '';
    const daysArr = daysParam ? daysParam.split(',').map(Number) : [];
    
    function formatDaysList(days) {
      if (!days || days.length === 0) return 'No days';
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days.map(d => names[d]).join(', ');
    }
    const daysListEl = document.getElementById('schedule-days-list');
    if (daysListEl) daysListEl.textContent = 'Active on: ' + formatDaysList(daysArr);

    // ── Circular Progress & Live Countdown Logic ──
    const ringEl = document.getElementById('sched-progress-ring');
    const countdownEl = document.getElementById('sched-timer-countdown');
    const totalCircumference = 427.26; // 2 * PI * 68

    function padZero(n) { return String(n).padStart(2, '0'); }

    function updateSchedCountdown() {
      const now = new Date();
      const [endH, endM] = endTime.split(':').map(Number);
      const [startH, startM] = startTime.split(':').map(Number);

      const targetEnd = new Date(now);
      targetEnd.setHours(endH, endM, 0, 0);

      const targetStart = new Date(now);
      targetStart.setHours(startH, startM, 0, 0);

      if (startH > endH || (startH === endH && startM > endM)) {
        // Overnight schedule e.g. 22:00 to 06:00
        if (now.getHours() < endH || (now.getHours() === endH && now.getMinutes() < endM)) {
          targetStart.setDate(targetStart.getDate() - 1);
        } else {
          targetEnd.setDate(targetEnd.getDate() + 1);
        }
      }

      const remainingMs = targetEnd.getTime() - now.getTime();
      const totalMs = Math.max(1000, targetEnd.getTime() - targetStart.getTime());

      if (remainingMs <= 0) {
        if (countdownEl) countdownEl.textContent = '00:00';
        if (ringEl) ringEl.style.strokeDashoffset = totalCircumference;
        return;
      }

      const totalSecs = Math.floor(remainingMs / 1000);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (countdownEl) {
        if (hrs > 0) {
          countdownEl.textContent = `${padZero(hrs)}:${padZero(mins)}:${padZero(secs)}`;
        } else {
          countdownEl.textContent = `${padZero(mins)}:${padZero(secs)}`;
        }
      }

      if (ringEl) {
        const progressRatio = Math.max(0, Math.min(1, remainingMs / totalMs));
        const offset = totalCircumference * (1 - progressRatio);
        ringEl.style.strokeDashoffset = offset;
      }
    }

    updateSchedCountdown();

    // Live tick to check if schedule becomes inactive
    function isScheduleActive(sched) {
      if (!sched.enabled) return false;
      const now = new Date();
      const currentDay = now.getDay(); // 0-6
      if (!sched.days.includes(currentDay)) return false;

      const [startH, startM] = sched.startTime.split(':').map(Number);
      const [endH, endM] = sched.endTime.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    }

    let scheduleCheckInterval = setInterval(() => {
      updateSchedCountdown();

      chrome.storage.local.get('schedules', (result) => {
        const schedules = result.schedules || [];
        // Find if there is still ANY active schedule for this site
        const active = schedules.some(sched => {
          if (!sched.enabled) return false;
          const d = sched.domain.toLowerCase().replace(/^www\./, '');
          const b = blockedSite.toLowerCase().replace(/^www\./, '');
          const matches = b === d || b.endsWith('.' + d);
          return matches && isScheduleActive(sched);
        });

        if (!active) {
          // No longer blocked by schedules! Restore tab.
          clearInterval(scheduleCheckInterval);
          window.location.href = originalUrl;
        }
      });
    }, 1000);

  } else if (isFilterType) {
    // Category Filter check interval — check if the category filter gets disabled in settings
    let filterCheckInterval = setInterval(() => {
      chrome.storage.local.get(null, (settings) => {
        const masterToggle = settings && settings.masterToggle !== false;
        
        let filterKey = 'filterAdult';
        const b = blockedSite.toLowerCase();
        if (b.includes('gaming')) filterKey = 'filterGaming';
        else if (b.includes('shopping')) filterKey = 'filterShopping';
        else if (b.includes('gambling')) filterKey = 'filterGambling';
        else if (b.includes('streaming')) filterKey = 'filterStreaming';
        
        const filterEnabled = settings && settings[filterKey];
        if (!masterToggle || !filterEnabled) {
          clearInterval(filterCheckInterval);
          window.location.href = originalUrl;
        }
      });
    }, 1000);
  } else if (isSubFeatureType) {
    // Sub-Feature check interval — check if the user disables this block in settings
    let subFeatureInterval = setInterval(() => {
      chrome.storage.local.get(null, (settings) => {
        const masterToggle = settings && settings.masterToggle !== false;
        
        let enabled = false;
        if (settings) {
          if (blockedSite.includes('youtube.com/shorts') && settings.youtube) {
            enabled = settings.youtube.enabled !== false && settings.youtube.shorts;
          } else if (blockedSite.includes('facebook.com/reels') && settings.facebook) {
            enabled = settings.facebook.enabled !== false && settings.facebook.reels;
          } else if (blockedSite.includes('facebook.com/messages') && settings.facebook) {
            enabled = settings.facebook.enabled !== false && settings.facebook.messenger;
          } else if (blockedSite.includes('messenger.com') && settings.facebook) {
            enabled = settings.facebook.enabled !== false && settings.facebook.messenger;
          } else if (blockedSite.includes('facebook.com/friends') && settings.facebook) {
            enabled = settings.facebook.enabled !== false && settings.facebook.friends;
          } else if (blockedSite.includes('facebook.com/groups') && settings.facebook) {
            enabled = settings.facebook.enabled !== false && settings.facebook.groups;
          } else if (blockedSite.includes('facebook.com/pages') && settings.facebook) {
            enabled = settings.facebook.enabled !== false && settings.facebook.pages;
          } else if (blockedSite.includes('x.com/messages') && settings.twitter) {
            enabled = settings.twitter.enabled !== false && settings.twitter.messages;
          } else if (blockedSite.includes('x.com/explore') && settings.twitter) {
            enabled = settings.twitter.enabled !== false && (settings.twitter.explore || settings.twitter.feed);
          } else if (blockedSite.includes('instagram.com/reels') && settings.instagram) {
            enabled = settings.instagram.enabled !== false && settings.instagram.reels;
          } else if (blockedSite.includes('instagram.com/explore') && settings.instagram) {
            enabled = settings.instagram.enabled !== false && settings.instagram.explore;
          } else if (blockedSite.includes('instagram.com/shop') && settings.instagram) {
            enabled = settings.instagram.enabled !== false && settings.instagram.shopping;
          } else if (blockedSite.includes('instagram.com/direct') && settings.instagram) {
            enabled = settings.instagram.enabled !== false && settings.instagram.messages;
          } else if (blockedSite.includes('instagram.com/stories') && settings.instagram) {
            enabled = settings.instagram.enabled !== false && settings.instagram.stories;
          } else if (blockedSite.includes('reddit.com/r/popular') && settings.reddit) {
            enabled = settings.reddit.enabled !== false && settings.reddit.popularAll;
          } else if (blockedSite.includes('tiktok.com/foryou') && settings.tiktok) {
            enabled = settings.tiktok.enabled !== false && settings.tiktok.foryou;
          } else if (blockedSite.includes('tiktok.com/following') && settings.tiktok) {
            enabled = settings.tiktok.enabled !== false && settings.tiktok.following;
          } else if (blockedSite.includes('tiktok.com/live') && settings.tiktok) {
            enabled = settings.tiktok.enabled !== false && settings.tiktok.live;
          } else if (blockedSite.includes('tiktok.com/shop') && settings.tiktok) {
            enabled = settings.tiktok.enabled !== false && settings.tiktok.shop;
          } else if (blockedSite.includes('tiktok.com/search') && settings.tiktok) {
            enabled = settings.tiktok.enabled !== false && settings.tiktok.search;
          } else if (blockedSite.includes('tiktok.com/upload') && settings.tiktok) {
            enabled = settings.tiktok.enabled !== false && settings.tiktok.upload;
          }
        }
        
        if (!masterToggle || !enabled) {
          clearInterval(subFeatureInterval);
          window.location.href = originalUrl;
        }
      });
    }, 1000);

  } else {
    // Standard Countdown — query chrome.storage.local to resolve exact hard block entry
    chrome.storage.local.get('hardBlockedSites', (res) => {
      const sites = (res && res.hardBlockedSites) || [];
      const targetClean = blockedSite.toLowerCase().replace(/^www\./, '');
      const entry = sites.find(s => s.domain.toLowerCase().replace(/^www\./, '') === targetClean);

      if (entry) {
        expiresAt = entry.expiresAt;
      }

      if (!entry) {
        // No active hard block entry found in storage! Unlock and go back to original URL
        removeHardBlock(blockedSite, () => {
          window.location.href = originalUrl;
        });
        return;
      }

      if (expiresAt > 0 && Date.now() >= expiresAt && expiresAt < 9000000000000) {
        // Already expired! Unlock and redirect immediately
        removeHardBlock(blockedSite, () => {
          window.location.href = originalUrl;
        });
        return;
      }

      startCountdown();
    });
  }

  // ── 4. GAME CHALLENGE ENGINE ───────────────────────────────────
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  let currentWrongClickCount = 0;

  function showWrongFeedback(cardElement, customMsg = 'Incorrect, try again! 🧠') {
    const card = cardElement.closest('.challenge-card') || cardElement;
    if (!card) return;

    currentWrongClickCount++;
    
    // 1st wrong click: 5s, 2nd wrong click: 10s, 3rd wrong click: 15s
    let waitSeconds = 5;
    if (currentWrongClickCount === 2) waitSeconds = 10;
    else if (currentWrongClickCount >= 3) waitSeconds = 15;

    // Freeze card interactions
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.75';

    // Get or create feedback element
    let feedback = card.querySelector('.challenge-feedback-tip');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'challenge-feedback-tip';
      card.appendChild(feedback);
    }

    feedback.style.flexDirection = 'column';

    let remaining = waitSeconds;

    function renderFeedbackContent() {
      feedback.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
          <span>${customMsg}</span>
        </div>
        <div style="font-size: 12.5px; opacity: 0.85; font-weight: 500; color: #fca5a5; margin-top: 4px;">
          Retry in ${remaining} second${remaining !== 1 ? 's' : ''}
        </div>
      `;
    }

    renderFeedbackContent();
    feedback.classList.add('show');

    if (card.feedbackTimeout) {
      clearInterval(card.feedbackTimeout);
    }

    card.feedbackTimeout = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(card.feedbackTimeout);
        card.feedbackTimeout = null;
        feedback.classList.remove('show');
        card.style.pointerEvents = 'auto';
        card.style.opacity = '1';
      } else {
        renderFeedbackContent();
      }
    }, 1000);
  }

  // ── GAME TYPE 1: Moving Target ─────────────────────────────────
  function makeMovingTargetChallenge() {
    const container = document.createElement('div');
    container.style.cssText = 'position:relative; height:220px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; margin-bottom:16px; cursor:default;';

    const totalClicks = randInt(5, 8);
    let clickCount = 0;

    const label = document.createElement('p');
    label.style.cssText = 'position:absolute; top:10px; left:0; right:0; text-align:center; font-size:12px; color:rgba(255,255,255,0.35); pointer-events:none; z-index:2;';
    label.textContent = `Click the target ${totalClicks} times`;

    const counter = document.createElement('div');
    counter.style.cssText = 'position:absolute; top:10px; right:14px; font-size:13px; font-weight:700; color:#ef4444; z-index:2;';
    counter.textContent = `0 / ${totalClicks}`;

    const target = document.createElement('div');
    target.style.cssText = `
      position:absolute; width:56px; height:56px; border-radius:50%;
      background:radial-gradient(circle at 35% 35%, #f87171, #ef4444);
      box-shadow:0 0 20px rgba(239,68,68,0.5); cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:20px; transition:transform 0.1s; z-index:3;
      user-select:none;
    `;
    target.textContent = '🎯';

    let onComplete = null;

    function moveTarget() {
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 220;
      const maxX = Math.max(10, w - 56 - 16);
      const maxY = Math.max(10, h - 56 - 16);
      const x = randInt(16, maxX);
      const y = randInt(40, maxY);
      target.style.left = x + 'px';
      target.style.top  = y + 'px';
    }

    target.addEventListener('click', () => {
      clickCount++;
      counter.textContent = `${clickCount} / ${totalClicks}`;
      target.style.transform = 'scale(0.85)';
      setTimeout(() => { target.style.transform = 'scale(1)'; }, 100);

      if (clickCount >= totalClicks) {
        target.style.background = 'radial-gradient(circle at 35% 35%, #34d399, #3ddc84)';
        target.style.boxShadow  = '0 0 20px rgba(61,220,132,0.5)';
        target.style.pointerEvents = 'none';
        setTimeout(() => { if (onComplete) onComplete(); }, 400);
        return;
      }

      setTimeout(moveTarget, 150);
    });

    moveTarget();
    setTimeout(moveTarget, 60);

    container.appendChild(label);
    container.appendChild(counter);
    container.appendChild(target);

    return {
      type: 'Moving Target',
      element: container,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 2: Memory Sequence ───────────────────────────────
  function makeMemorySequenceChallenge() {
    const colors    = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7'];
    const colorNames= ['Red','Orange','Yellow','Green','Blue','Purple'];
    const seqLen    = randInt(4, 6);
    let sequence    = Array.from({ length: seqLen }, () => randInt(0, 5));
    let userInput   = [];
    let onComplete  = null;
    let phase       = 'watch'; // 'watch' | 'input'

    const wrapper = document.createElement('div');

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:14px;';

    const phaseLabel = document.createElement('span');
    phaseLabel.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.5); font-weight:500;';
    phaseLabel.textContent = `Watch the sequence... (${seqLen} colors)`;

    const replayBtn = document.createElement('button');
    replayBtn.style.cssText = 'background:none; border:none; color:var(--accent); opacity:0.4; cursor:default; font-size:14px; padding:2px; display:inline-flex; align-items:center; transition:opacity 0.2s;';
    replayBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    `;
    replayBtn.title = 'Replay (generates a new sequence)';
    replayBtn.disabled = true;

    replayBtn.addEventListener('mouseenter', () => { if (!replayBtn.disabled) replayBtn.style.opacity = '1'; });
    replayBtn.addEventListener('mouseleave', () => { if (!replayBtn.disabled) replayBtn.style.opacity = '0.7'; });

    headerRow.appendChild(phaseLabel);
    headerRow.appendChild(replayBtn);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px;';

    let isLocked = false;

    const btns = colors.map((c, i) => {
      const b = document.createElement('button');
      b.style.cssText = `height:52px; border-radius:10px; border:2px solid ${c}40; background:${c}15; color:${c}; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; letter-spacing:0.04em; font-family:inherit;`;
      b.textContent = colorNames[i];
      b.disabled = true;
      b.addEventListener('click', () => {
        if (phase !== 'input' || isLocked) return;
        b.style.transform = 'scale(0.9)';
        setTimeout(() => b.style.transform = 'scale(1)', 150);
        userInput.push(i);

        const pos = userInput.length - 1;
        if (userInput[pos] !== sequence[pos]) {
          // Wrong
          isLocked = true;
          b.style.borderColor = '#ef4444';
          b.style.background  = '#ef444430';
          showWrongFeedback(wrapper, 'Oops! Wrong sequence, try watching again.');
          setTimeout(() => {
            userInput = [];
            btns.forEach((x, xi) => {
              x.style.borderColor = `${colors[xi]}40`;
              x.style.background  = `${colors[xi]}15`;
            });
            isLocked = false;
          }, 500);
          return;
        }

        b.style.borderColor = '#3ddc84';
        b.style.background  = '#3ddc8430';
        setTimeout(() => {
          b.style.borderColor = `${c}40`;
          b.style.background  = `${c}15`;
        }, 300);

        if (userInput.length === seqLen) {
          isLocked = true;
          setTimeout(() => { if (onComplete) onComplete(); }, 400);
        }
      });
      return b;
    });

    btns.forEach(b => grid.appendChild(b));

    const progressBar = document.createElement('p');
    progressBar.style.cssText = 'text-align:center; font-size:11px; color:rgba(255,255,255,0.3); margin-top:4px;';

    replayBtn.addEventListener('click', () => {
      if (phase !== 'input' || isLocked) return;
      phase = 'watch';
      replayBtn.disabled = true;
      replayBtn.style.opacity = '0.4';
      replayBtn.style.cursor = 'default';
      btns.forEach(b => {
        b.disabled = true;
        b.style.cursor = 'default';
        b.style.borderColor = b.style.borderColor.replace('aa', '40');
        b.style.background = b.style.background.replace('aa', '15');
      });
      userInput = [];
      // Generate a new, different sequence
      sequence = Array.from({ length: seqLen }, () => randInt(0, 5));
      phaseLabel.textContent = `Watch the sequence... (${seqLen} colors)`;
      setTimeout(() => playSequence(0), 400);
    });

    wrapper.appendChild(headerRow);
    wrapper.appendChild(grid);
    wrapper.appendChild(progressBar);

    // Animate the sequence
    function playSequence(idx) {
      if (idx >= seqLen) {
        phase = 'input';
        phaseLabel.textContent = '🎮 Now repeat the sequence!';
        btns.forEach(b => { b.disabled = false; b.style.cursor = 'pointer'; });
        replayBtn.disabled = false;
        replayBtn.style.opacity = '1';
        replayBtn.style.cursor = 'pointer';
        return;
      }
      const ci = sequence[idx];
      btns[ci].style.background  = colors[ci] + 'aa';
      btns[ci].style.borderColor = colors[ci];
      btns[ci].style.transform   = 'scale(1.05)';
      setTimeout(() => {
        btns[ci].style.background  = colors[ci] + '15';
        btns[ci].style.borderColor = colors[ci] + '40';
        btns[ci].style.transform   = 'scale(1)';
        setTimeout(() => playSequence(idx + 1), 300);
      }, 600);
    }

    setTimeout(() => playSequence(0), 600);

    return {
      type: 'Memory Sequence',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 3: Rapid Clicks ──────────────────────────────────
  function makeRapidClickChallenge() {
    const target = randInt(20, 30);
    let clicks   = 0;
    let onComplete = null;
    let started  = false;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align:center;';

    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:16px;';
    instr.textContent = `Hammer the button ${target} times!`;

    const countDisplay = document.createElement('div');
    countDisplay.style.cssText = 'font-size:52px; font-weight:800; color:#ef4444; letter-spacing:-0.04em; margin-bottom:16px; font-variant-numeric:tabular-nums; line-height:1;';
    countDisplay.textContent = `0 / ${target}`;

    const progressTrack = document.createElement('div');
    progressTrack.style.cssText = 'height:6px; background:rgba(255,255,255,0.06); border-radius:3px; margin-bottom:20px; overflow:hidden;';
    const progressBar = document.createElement('div');
    progressBar.style.cssText = 'height:100%; width:0%; background:linear-gradient(90deg,#ef4444,#f97316); border-radius:3px; transition:width 0.1s;';
    progressTrack.appendChild(progressBar);

    const btn = document.createElement('button');
    btn.style.cssText = `
      width:100%; padding:18px; background:rgba(239,68,68,0.12);
      border:2px solid rgba(239,68,68,0.35); border-radius:12px;
      color:#fca5a5; font-size:18px; font-weight:700; cursor:pointer;
      transition:all 0.08s; font-family:inherit; user-select:none;
    `;
    btn.textContent = '👊 CLICK ME';

    btn.addEventListener('click', () => {
      clicks++;
      started = true;
      const pct = Math.min((clicks / target) * 100, 100);
      progressBar.style.width = pct + '%';
      countDisplay.textContent = `${clicks} / ${target}`;
      btn.style.transform = 'scale(0.95)';
      btn.style.background = 'rgba(239,68,68,0.22)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
        btn.style.background = 'rgba(239,68,68,0.12)';
      }, 80);

      if (clicks >= target) {
        btn.disabled = true;
        btn.style.background = 'rgba(61,220,132,0.15)';
        btn.style.borderColor = 'rgba(61,220,132,0.4)';
        btn.style.color = '#3ddc84';
        btn.textContent = '✓ Done!';
        progressBar.style.background = 'linear-gradient(90deg,#3ddc84,#34d399)';
        setTimeout(() => { if (onComplete) onComplete(); }, 400);
      }
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(countDisplay);
    wrapper.appendChild(progressTrack);
    wrapper.appendChild(btn);

    return {
      type: 'Rapid Click',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 4: Stroop Test (Color vs Word) ───────────────────
  function makeStroopChallenge() {
    const items = [
      { word:'RED',    textColor:'#3b82f6', answer:0 },
      { word:'GREEN',  textColor:'#ef4444', answer:1 },
      { word:'BLUE',   textColor:'#eab308', answer:2 },
      { word:'YELLOW', textColor:'#a855f7', answer:3 },
      { word:'PURPLE', textColor:'#22c55e', answer:4 },
      { word:'ORANGE', textColor:'#f97316', answer:5 },
    ];
    const colorMap = [
      { label:'RED',    bg:'#ef4444' },
      { label:'GREEN',  bg:'#22c55e' },
      { label:'BLUE',   bg:'#3b82f6' },
      { label:'YELLOW', bg:'#eab308' },
      { label:'PURPLE', bg:'#a855f7' },
      { label:'ORANGE', bg:'#f97316' },
    ];

    const rounds  = randInt(4, 5);
    let current   = 0;
    let score     = 0;
    let onComplete= null;
    let shuffled  = [...items].sort(() => Math.random() - 0.5).slice(0, rounds);

    const wrapper = document.createElement('div');

    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:12px; color:rgba(255,255,255,0.4); margin-bottom:10px; text-align:center;';
    instr.textContent = 'Click the button that matches the TEXT — ignore the display color!';

    const roundLabel = document.createElement('p');
    roundLabel.style.cssText = 'text-align:center; font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:12px;';

    const wordDisplay = document.createElement('div');
    wordDisplay.style.cssText = 'text-align:center; font-size:42px; font-weight:800; letter-spacing:-0.04em; margin-bottom:20px; font-variant-numeric:tabular-nums; transition:all 0.2s;';

    let isProcessingClick = false;

    const btnGrid = document.createElement('div');
    btnGrid.style.cssText = 'display:grid; grid-template-columns:repeat(3,1fr); gap:6px;';
    const choiceBtns = colorMap.map((c, i) => {
      const b = document.createElement('button');
      b.style.cssText = `padding:9px 4px; background:${c.bg}20; border:1px solid ${c.bg}50; border-radius:8px; color:${c.bg}; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:inherit;`;
      b.textContent = c.label;
      b.addEventListener('click', () => {
        if (isProcessingClick) return;
        isProcessingClick = true;

        const item    = shuffled[current];
        if (!item) {
          isProcessingClick = false;
          return;
        }

        const correct = i === item.answer;
        if (correct) {
          score++;
          b.style.background = `${c.bg}50`;
          b.style.transform  = 'scale(1.05)';
        } else {
          b.style.background = '#ef444430';
          b.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Match the font color, not the word text.');
        }
        setTimeout(() => {
          b.style.background = `${c.bg}20`;
          b.style.borderColor = `${c.bg}50`;
          b.style.transform = 'scale(1)';
          current++;
          if (current >= rounds) {
            if (score >= Math.ceil(rounds * 0.6)) {
              setTimeout(() => {
                isProcessingClick = false;
                if (onComplete) onComplete();
              }, 300);
            } else {
              // Reset with new shuffled set
              current = 0; score = 0;
              shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, rounds);
              showRound();
              isProcessingClick = false;
            }
          } else {
            showRound();
            isProcessingClick = false;
          }
        }, 350);
      });
      return b;
    });
    choiceBtns.forEach(b => btnGrid.appendChild(b));

    function showRound() {
      const item = shuffled[current];
      wordDisplay.textContent = item.word;
      wordDisplay.style.color = item.textColor;
      roundLabel.textContent  = `Round ${current + 1} / ${rounds}`;
    }
    showRound();

    wrapper.appendChild(instr);
    wrapper.appendChild(roundLabel);
    wrapper.appendChild(wordDisplay);
    wrapper.appendChild(btnGrid);

    return {
      type: 'Color Brain',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 5: Sort the Numbers ──────────────────────────────
  function makeSortingChallenge() {
    const count  = randInt(5, 7);
    const nums   = Array.from({ length: count }, () => randInt(1, 99));
    let onComplete = null;
    let dragSrc = null;

    const wrapper = document.createElement('div');

    const sortAscending = Math.random() > 0.5;

    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:14px; text-align:center;';
    instr.textContent = sortAscending ? 'Drag to sort the numbers from smallest to largest ↑' : 'Drag to sort the numbers from largest to smallest ↓';

    const list  = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

    // Shuffle numbers
    const shuffled = [...nums].sort(() => Math.random() - 0.5);
    const sorted   = [...nums].sort((a, b) => sortAscending ? (a - b) : (b - a));

    function checkOrder() {
      const current = [...list.children].map(c => parseInt(c.dataset.val));
      return current.join(',') === sorted.join(',');
    }

    function updateColors() {
      const correct = checkOrder();
      [...list.children].forEach(c => {
        if (correct) {
          c.style.borderColor  = 'rgba(61,220,132,0.4)';
          c.style.background   = 'rgba(61,220,132,0.1)';
          c.style.color        = '#3ddc84';
        } else {
          c.style.borderColor  = 'rgba(239,68,68,0.3)';
          c.style.background   = 'rgba(239,68,68,0.06)';
          c.style.color        = '#fca5a5';
        }
      });
    }

    function makeItem(val) {
      const item = document.createElement('div');
      item.dataset.val = val;
      item.draggable   = true;
      item.style.cssText = `
        padding:10px 16px; background:rgba(239,68,68,0.06);
        border:1px solid rgba(239,68,68,0.3); border-radius:8px;
        display:flex; align-items:center; gap:10px; cursor:grab;
        font-size:15px; font-weight:700; color:#fca5a5; transition:all 0.15s;
        user-select:none;
      `;
      item.innerHTML = `<span style="opacity:0.35;font-size:11px;">☰</span> <span>${val}</span>`;

      item.addEventListener('dragstart', e => {
        dragSrc = item;
        e.dataTransfer.effectAllowed = 'move';
        item.style.opacity = '0.4';
      });
      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        dragSrc = null;
        updateColors();
        if (checkOrder()) {
          [...list.children].forEach(c => {
            c.draggable = false;
          });
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        }
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.style.background = 'rgba(61,220,132,0.18)';
      });
      item.addEventListener('dragleave', () => {
        updateColors();
      });
      item.addEventListener('drop', e => {
        e.preventDefault();
        if (dragSrc && dragSrc !== item) {
          const items = [...list.children];
          const srcIdx = items.indexOf(dragSrc);
          const dstIdx = items.indexOf(item);
          if (srcIdx < dstIdx) {
            list.insertBefore(dragSrc, item.nextSibling);
          } else {
            list.insertBefore(dragSrc, item);
          }
        }
        updateColors();
      });
      return item;
    }

    shuffled.forEach(n => list.appendChild(makeItem(n)));
    updateColors();

    wrapper.appendChild(instr);
    wrapper.appendChild(list);

    return {
      type: sortAscending ? 'Sort Ascending' : 'Sort Descending',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 6: Find the Odd One Out ─────────────────────────
  function makeOddOneOutChallenge() {
    const SETS = [
      { items: ['🍎','🍊','🍋','🍇','🍓','🏠','🍑','🍒'], odd: 5, name: 'not a fruit' },
      { items: ['🐶','🐱','🐭','🚗','🐹','🐰','🦊','🐻'], odd: 3, name: 'not an animal' },
      { items: ['2','4','6','3','8','10','12','14'],       odd: 3, name: 'odd number' },
      { items: ['🔴','🔵','🟢','🟡','⬛','🟣','🟤','🟠'], odd: 4, name: 'not colorful' },
      { items: ['A','B','C','D','1','F','G','H'],          odd: 4, name: 'not a letter' },
    ];

    const rounds  = randInt(3, 4);
    let current   = 0;
    let onComplete= null;
    let pool      = [...SETS].sort(() => Math.random() - 0.5).slice(0, rounds);

    const wrapper = document.createElement('div');

    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:6px; text-align:center;';
    instr.textContent = 'Find the one that does NOT belong!';

    const roundInfo = document.createElement('p');
    roundInfo.style.cssText = 'text-align:center; font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:14px;';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(4,1fr); gap:8px;';

    function showRound() {
      grid.innerHTML = '';
      const set = pool[current];
      roundInfo.textContent = `Round ${current + 1} / ${rounds}`;

      const shuffledItems = set.items.map((item, i) => ({ item, origIdx: i }))
        .sort(() => Math.random() - 0.5);

      shuffledItems.forEach(({ item, origIdx }) => {
        const cell = document.createElement('button');
        cell.style.cssText = `
          height:58px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:10px; font-size:22px; cursor:pointer; transition:all 0.15s; font-family:inherit;
        `;
        cell.textContent = item;
        cell.addEventListener('click', () => {
          const isOdd = origIdx === set.odd;
          if (isOdd) {
            cell.style.background   = 'rgba(61,220,132,0.2)';
            cell.style.borderColor  = 'rgba(61,220,132,0.5)';
            cell.style.transform    = 'scale(1.1)';
            setTimeout(() => {
              current++;
              if (current >= rounds) {
                setTimeout(() => { if (onComplete) onComplete(); }, 400);
              } else {
                showRound();
              }
            }, 500);
          } else {
            cell.style.background   = 'rgba(239,68,68,0.2)';
            cell.style.borderColor  = 'rgba(239,68,68,0.5)';
            cell.style.animation    = 'shake 0.3s ease';
            showWrongFeedback(wrapper, 'Oops! That belongs in the group.');
            setTimeout(() => {
              cell.style.background  = 'rgba(255,255,255,0.04)';
              cell.style.borderColor = 'rgba(255,255,255,0.08)';
              cell.style.animation   = '';
            }, 400);
          }
        });
        grid.appendChild(cell);
      });
    }
    showRound();

    wrapper.appendChild(instr);
    wrapper.appendChild(roundInfo);
    wrapper.appendChild(grid);

    return {
      type: 'Odd One Out',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 7: Math Quiz ─────────────────────────────────────
  function makeMathQuizChallenge() {
    const rounds = 3;
    let current = 0;
    let onComplete = null;
    let isProcessing = false;

    const wrapper = document.createElement('div');
    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:6px; text-align:center;';
    instr.textContent = 'Solve the equation to prove you are focused!';

    const roundInfo = document.createElement('p');
    roundInfo.style.cssText = 'text-align:center; font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:14px;';

    const equationDisplay = document.createElement('div');
    equationDisplay.style.cssText = 'text-align:center; font-size:32px; font-weight:800; color:#3ddc84; margin-bottom:20px; letter-spacing:-0.03em;';

    const choicesGrid = document.createElement('div');
    choicesGrid.style.cssText = 'display:grid; grid-template-columns:repeat(3,1fr); gap:8px;';

    function generateQuestion() {
      const ops = ['+', '-', '*'];
      const op = ops[randInt(0, 2)];
      let num1 = 0, num2 = 0, answer = 0;

      if (op === '+') {
        num1 = randInt(10, 80);
        num2 = randInt(10, 80);
        answer = num1 + num2;
      } else if (op === '-') {
        num1 = randInt(40, 99);
        num2 = randInt(5, 39);
        answer = num1 - num2;
      } else {
        num1 = randInt(3, 12);
        num2 = randInt(3, 9);
        answer = num1 * num2;
      }

      // Generate wrong choices
      const wrong1 = answer + randInt(3, 10) * (Math.random() > 0.5 ? 1 : -1);
      const wrong2 = answer + randInt(11, 20) * (Math.random() > 0.5 ? 1 : -1);
      const choices = [answer, wrong1, wrong2].sort(() => Math.random() - 0.5);

      return { num1, num2, op, answer, choices };
    }

    let q = generateQuestion();

    function showRound() {
      isProcessing = false;
      roundInfo.textContent = `Round ${current + 1} / ${rounds}`;
      equationDisplay.textContent = `${q.num1} ${q.op} ${q.num2} = ?`;

      choicesGrid.innerHTML = '';
      q.choices.forEach(val => {
        const choiceBtn = document.createElement('button');
        choiceBtn.style.cssText = 'height:50px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; color:#fff; font-size:16px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:inherit;';
        choiceBtn.textContent = val;
        choiceBtn.addEventListener('click', () => {
          if (isProcessing) return;
          isProcessing = true;

          if (val === q.answer) {
            choiceBtn.style.background = 'rgba(61,220,132,0.2)';
            choiceBtn.style.borderColor = 'rgba(61,220,132,0.5)';
            choiceBtn.style.color = '#3ddc84';
            setTimeout(() => {
              current++;
              if (current >= rounds) {
                if (onComplete) onComplete();
              } else {
                q = generateQuestion();
                showRound();
              }
            }, 400);
          } else {
            choiceBtn.style.background = 'rgba(239,68,68,0.2)';
            choiceBtn.style.borderColor = 'rgba(239,68,68,0.5)';
            choiceBtn.style.animation = 'shake 0.3s ease';
            showWrongFeedback(wrapper, 'Oops! Check your arithmetic.');
            setTimeout(() => {
              choiceBtn.style.background = 'rgba(255,255,255,0.03)';
              choiceBtn.style.borderColor = 'rgba(255,255,255,0.07)';
              choiceBtn.style.animation = '';
              isProcessing = false;
            }, 400);
          }
        });
        choicesGrid.appendChild(choiceBtn);
      });
    }

    showRound();
    wrapper.appendChild(instr);
    wrapper.appendChild(roundInfo);
    wrapper.appendChild(equationDisplay);
    wrapper.appendChild(choicesGrid);

    return {
      type: 'Arithmetic Speed',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 8: Tap the Even Numbers ──────────────────────────
  function makeEvenNumbersChallenge() {
    let onComplete = null;
    const nums = [];
    let neededCount = 0;
    let selectedCount = 0;

    const requireEven = Math.random() > 0.5;

    // Pick 8 random numbers
    while (nums.length < 8) {
      const val = randInt(3, 98);
      if (!nums.includes(val)) {
        nums.push(val);
        const isTarget = requireEven ? (val % 2 === 0) : (val % 2 !== 0);
        if (isTarget) neededCount++;
      }
    }

    // Edge case: if no targets picked, swap one
    if (neededCount === 0) {
      nums[0] = requireEven ? 12 : 13;
      neededCount = 1;
    }

    const wrapper = document.createElement('div');
    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:14px; text-align:center;';
    instr.textContent = requireEven ? 'Tap only the EVEN numbers!' : 'Tap only the ODD numbers!';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(4,1fr); gap:8px;';

    nums.forEach(val => {
      const cell = document.createElement('button');
      cell.style.cssText = 'height:54px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; color:#fff; font-size:16px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:inherit;';
      cell.textContent = val;

      let isSelected = false;
      const isTarget = requireEven ? (val % 2 === 0) : (val % 2 !== 0);

      cell.addEventListener('click', () => {
        if (isTarget) {
          if (!isSelected) {
            isSelected = true;
            cell.style.background = 'rgba(61,220,132,0.18)';
            cell.style.borderColor = 'rgba(61,220,132,0.4)';
            cell.style.color = '#3ddc84';
            selectedCount++;
            if (selectedCount === neededCount) {
              setTimeout(() => { if (onComplete) onComplete(); }, 400);
            }
          }
        } else {
          cell.style.background = 'rgba(239,68,68,0.2)';
          cell.style.borderColor = 'rgba(239,68,68,0.5)';
          cell.style.animation = 'shake 0.35s ease';
          showWrongFeedback(wrapper, requireEven ? 'Oops! That is an odd number.' : 'Oops! That is an even number.');
          setTimeout(() => {
            cell.style.background = 'rgba(255,255,255,0.03)';
            cell.style.borderColor = 'rgba(255,255,255,0.07)';
            cell.style.animation = '';
          }, 450);
        }
      });
      grid.appendChild(cell);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: requireEven ? 'Even Filter' : 'Odd Filter',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 9: Spell Focus (Word Unscramble) ─────────────────
  function makeWordUnscrambleChallenge() {
    const WORDS = ['FOCUS', 'SHIELD', 'MIND', 'BRAIN', 'TIMER', 'STUDY', 'CLARITY'];
    const targetWord = WORDS[randInt(0, WORDS.length - 1)];
    let currentLetters = [];
    let onComplete = null;

    const wrapper = document.createElement('div');
    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:10px; text-align:center;';
    instr.textContent = `Tap letters to spell: ${targetWord}`;

    const preview = document.createElement('div');
    preview.style.cssText = 'height:40px; border-bottom:1.5px dashed rgba(255,255,255,0.12); margin-bottom:20px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:24px; font-weight:800; color:#3ddc84; letter-spacing:0.08em;';

    const lettersGrid = document.createElement('div');
    lettersGrid.style.cssText = 'display:flex; gap:8px; justify-content:center; flex-wrap:wrap;';

    // Scramble letters
    const letterObjs = targetWord.split('').map((char, index) => ({ char, index }))
      .sort(() => Math.random() - 0.5);

    letterObjs.forEach(obj => {
      const btn = document.createElement('button');
      btn.style.cssText = 'width:42px; height:42px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:inherit;';
      btn.textContent = obj.char;

      btn.addEventListener('click', () => {
        const nextIndex = currentLetters.length;
        if (targetWord[nextIndex] === obj.char) {
          btn.style.opacity = '0.25';
          btn.style.pointerEvents = 'none';
          currentLetters.push(obj.char);
          preview.textContent = currentLetters.join('');

          if (currentLetters.join('') === targetWord) {
            setTimeout(() => { if (onComplete) onComplete(); }, 400);
          }
        } else {
          // Reset
          btn.style.background = 'rgba(239,68,68,0.2)';
          btn.style.borderColor = 'rgba(239,68,68,0.5)';
          btn.style.animation = 'shake 0.3s ease';
          showWrongFeedback(wrapper, 'Oops! Incorrect spelling sequence, resetting word.');
          setTimeout(() => {
            btn.style.background = 'rgba(255,255,255,0.04)';
            btn.style.borderColor = 'rgba(255,255,255,0.08)';
            btn.style.animation = '';
            
            // Reset all buttons
            currentLetters = [];
            preview.textContent = '';
            [...lettersGrid.children].forEach(b => {
              b.style.opacity = '1';
              b.style.pointerEvents = 'auto';
            });
          }, 400);
        }
      });

      lettersGrid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(preview);
    wrapper.appendChild(lettersGrid);

    return {
      type: 'Spelling Anagram',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 10: Find Target Color ────────────────────────────
  function makeFindColorChallenge() {
    const COLORS = [
      { name: 'Red',    hex: '#ef4444' },
      { name: 'Green',  hex: '#22c55e' },
      { name: 'Blue',   hex: '#3b82f6' },
      { name: 'Yellow', hex: '#eab308' },
      { name: 'Purple', hex: '#a855f7' },
      { name: 'Orange', hex: '#f97316' }
    ];

    const targetIdx = randInt(0, COLORS.length - 1);
    const target = COLORS[targetIdx];
    let clickedCount = 0;
    let onComplete = null;

    // Grid of 12 items (exactly 3 matching target)
    const gridItems = [];
    for (let i = 0; i < 3; i++) gridItems.push(target);
    while (gridItems.length < 12) {
      const idx = randInt(0, COLORS.length - 1);
      if (idx !== targetIdx) {
        gridItems.push(COLORS[idx]);
      }
    }

    // Shuffle
    gridItems.sort(() => Math.random() - 0.5);

    const wrapper = document.createElement('div');
    const instr = document.createElement('p');
    instr.style.cssText = 'font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:12px; text-align:center;';
    instr.innerHTML = `Click all 3 <span style="color:${target.hex};font-weight:800;text-transform:uppercase;">${target.name}</span> blocks!`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(4,1fr); gap:8px;';

    gridItems.forEach(item => {
      const cell = document.createElement('button');
      cell.style.cssText = `height:50px; background:${item.hex}18; border:1px solid ${item.hex}30; border-radius:8px; cursor:pointer; transition:all 0.15s;`;

      let cellClicked = false;

      cell.addEventListener('click', () => {
        if (cellClicked) return;

        if (item.name === target.name) {
          cellClicked = true;
          cell.style.background = item.hex;
          cell.style.borderColor = item.hex;
          cell.style.boxShadow = `0 0 12px ${item.hex}`;
          clickedCount++;

          if (clickedCount === 3) {
            setTimeout(() => { if (onComplete) onComplete(); }, 400);
          }
        } else {
          cell.style.animation = 'shake 0.35s ease';
          cell.style.background = '#ef444425';
          cell.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That is a different color.');
          setTimeout(() => {
            cell.style.animation = '';
            cell.style.background = `${item.hex}18`;
            cell.style.borderColor = `${item.hex}30`;
          }, 450);
        }
      });
      grid.appendChild(cell);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Color Search',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 11: Mirror Reading ──────────────────────────────
  function makeMirrorTextChallenge() {
    const words = ['FOCUS', 'ATTENTION', 'DISCIPLINE', 'DEDICATION', 'STREAK'];
    const word = words[randInt(0, words.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Read the mirrored word and type it:';

    const wordEl = document.createElement('div');
    wordEl.style.cssText = 'font-size: 24px; font-weight: 700; color: var(--accent); margin: 15px 0; text-align: center; transform: scaleX(-1); display: block; font-family: monospace; letter-spacing: 2px; text-shadow: 0 0 8px rgba(61,220,132,0.3);';
    wordEl.textContent = word;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'challenge-input';
    input.placeholder = 'Type word here...';
    input.style.textAlign = 'center';

    input.addEventListener('input', () => {
      const val = input.value.trim().toUpperCase();
      if (val === word) {
        input.disabled = true;
        input.style.borderColor = '#3ddc84';
        input.style.boxShadow = '0 0 12px rgba(61, 220, 132, 0.4)';
        setTimeout(() => { if (onComplete) onComplete(); }, 500);
      }
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(wordEl);
    wrapper.appendChild(input);

    return {
      type: 'Mirror Reading',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 12: Vowel Counting ───────────────────────────────
  function makeVowelCounterChallenge() {
    const items = [
      { w: 'FOCUS', c: 2 },
      { w: 'ATTENTION', c: 4 },
      { w: 'DEDICATION', c: 5 },
      { w: 'SHIELD', c: 2 },
      { w: 'PRODUCTIVITY', c: 4 }
    ];
    const item = items[randInt(0, items.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `How many vowels in word:<br><strong style="color:var(--accent); font-size:20px; font-family:monospace;">${item.w}</strong>?`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    const options = [1, 2, 3, 4, 5].filter(x => x !== item.c).slice(0, 3);
    options.push(item.c);
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (opt === item.c) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That count is incorrect.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Vowel Counting',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 13: Logic Gate Challenge ─────────────────────────
  function makeLogicGatesChallenge() {
    const gates = [
      { q: 'true AND false', a: false },
      { q: 'true OR false', a: true },
      { q: 'NOT false', a: true },
      { q: 'NOT (true AND true)', a: false },
      { q: 'true AND true', a: true }
    ];
    const gate = gates[randInt(0, gates.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Solve logic: <br><strong style="color:var(--accent); font-family:monospace; font-size:18px;">${gate.q}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px;';

    [true, false].forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = val.toString().toUpperCase();

      btn.addEventListener('click', () => {
        if (val === gate.a) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That is incorrect logic.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Logic Gate',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 14: Pattern Sequence Match ───────────────────────
  function makePatternCompletionChallenge() {
    const patterns = [
      { seq: '2, 4, 8, 16, ?', a: 32 },
      { seq: '5, 10, 15, 20, ?', a: 25 },
      { seq: '1, 4, 9, 16, ?', a: 25 },
      { seq: '1, 2, 4, 7, 11, ?', a: 16 },
      { seq: '10, 9, 7, 4, ?', a: 0 }
    ];
    const pat = patterns[randInt(0, patterns.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Complete the sequence:<br><strong style="color:var(--accent); font-family:monospace; font-size:20px; letter-spacing:1px;">${pat.seq}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    const options = [8, 12, 20, 24, 30, 36].filter(x => x !== pat.a).slice(0, 3);
    options.push(pat.a);
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (opt === pat.a) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That does not fit the sequence.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Sequence Match',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 15: Order Letters Alphabetically ──────────────────
  function makeAscendingLettersChallenge() {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    const selected = [];
    while (selected.length < 4) {
      const char = letters[randInt(0, letters.length - 1)];
      if (!selected.includes(char)) selected.push(char);
    }
    const targetOrder = [...selected].sort();
    const scramble = [...selected].sort(() => Math.random() - 0.5);

    let clicked = [];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Click letters in alphabetical order:';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    scramble.forEach(char => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = char;

      btn.addEventListener('click', () => {
        if (btn.style.background === 'var(--accent)') return; // already clicked

        const expected = targetOrder[clicked.length];
        if (char === expected) {
          clicked.push(char);
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';

          if (clicked.length === 4) {
            setTimeout(() => { if (onComplete) onComplete(); }, 500);
          }
        } else {
          // wrong order, reset
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Follow alphabetical order.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
            clicked = [];
            [...grid.children].forEach(b => {
              b.style.background = 'rgba(255,255,255,0.03)';
              b.style.color = 'var(--text)';
              b.style.borderColor = 'var(--border)';
              b.style.boxShadow = 'none';
            });
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Order Letters',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 16: Symbol Counter ──────────────────────────────
  function makeSymbolCounterChallenge() {
    const list = [
      { sym: '★', count: 4, seq: '★ ▲ ★ ● ★ ■ ▲ ★' },
      { sym: '▲', count: 3, seq: '▲ ★ ▲ ● ■ ▲ ★' },
      { sym: '●', count: 3, seq: '● ▲ ★ ● ■ ● ▲' },
      { sym: '■', count: 2, seq: '★ ■ ▲ ● ■ ★ ●' }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Count how many times <strong style="color:var(--accent);">${item.sym}</strong> appears:<br><span style="letter-spacing:4px; font-size:16px; margin:8px 0; display:block;">${item.seq}</span>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    const options = [1, 2, 3, 4, 5].filter(x => x !== item.count).slice(0, 3);
    options.push(item.count);
    options.sort();

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (opt === item.count) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That count is incorrect.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Symbol Count',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 17: Capital City Match ────────────────────────────
  function makeCapitalCityChallenge() {
    const list = [
      { country: 'Japan', cap: 'Tokyo', opts: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'] },
      { country: 'France', cap: 'Paris', opts: ['London', 'Berlin', 'Paris', 'Rome'] },
      { country: 'Italy', cap: 'Rome', opts: ['Rome', 'Athens', 'Madrid', 'Paris'] },
      { country: 'Germany', cap: 'Berlin', opts: ['Munich', 'Berlin', 'Vienna', 'London'] }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `What is the capital of:<br><strong style="color:var(--accent); font-size:18px;">${item.country}</strong>?`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;';

    item.opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 600; font-size:12.5px; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (opt === item.cap) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That is the wrong capital.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Trivia Match',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 18: Prime Number Finder ───────────────────────────
  function makePrimeNumberChallenge() {
    const sets = [
      { prime: 17, list: [15, 12, 17, 9] },
      { prime: 13, list: [8, 15, 13, 21] },
      { prime: 7, list: [4, 7, 9, 12] },
      { prime: 29, list: [25, 29, 21, 27] }
    ];
    const item = sets[randInt(0, sets.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Select the prime number:';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    item.list.forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = val;

      btn.addEventListener('click', () => {
        if (val === item.prime) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That number is not prime.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Prime Finder',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 19: Timing Test (Rhythm Tap) ──────────────────────
  function makeRhythmTapChallenge() {
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Tap target when red dot hits green zone:';

    const track = document.createElement('div');
    track.style.cssText = 'width: 100%; height: 20px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 99px; position: relative; margin: 15px 0; overflow: hidden;';

    const zone = document.createElement('div');
    zone.style.cssText = 'position: absolute; left: 40%; width: 20%; height: 100%; background: rgba(61,220,132,0.25); border-left: 1px solid var(--accent); border-right: 1px solid var(--accent);';
    track.appendChild(zone);

    const dot = document.createElement('div');
    dot.style.cssText = 'position: absolute; top: 2px; left: 0px; width: 14px; height: 14px; background: #ef4444; border-radius: 99px; box-shadow: 0 0 6px #ef4444;';
    track.appendChild(dot);

    let direction = 1;
    let position = 0;
    let animationTimer = setInterval(() => {
      position += direction * 3.5;
      if (position >= 100 || position <= 0) {
        direction *= -1;
      }
      dot.style.left = `calc(${position}% - ${position > 50 ? '14px' : '0px'})`;
    }, 20);

    const tapBtn = document.createElement('button');
    tapBtn.className = 'btn-primary';
    tapBtn.style.cssText = 'width: 100%; padding: 10px; background: var(--accent); color: var(--accent-text); border: none; border-radius: var(--radius); font-weight: 700; font-family: inherit; cursor: pointer;';
    tapBtn.textContent = 'TAP!';

    tapBtn.addEventListener('click', () => {
      // Zone is between 40% and 60%
      if (position >= 38 && position <= 62) {
        clearInterval(animationTimer);
        dot.style.background = 'var(--accent)';
        dot.style.boxShadow = '0 0 8px var(--accent)';
        tapBtn.style.background = '#3ddc84';
        setTimeout(() => { if (onComplete) onComplete(); }, 500);
      } else {
        tapBtn.style.animation = 'shake 0.35s ease';
        tapBtn.style.background = '#ef4444';
        showWrongFeedback(wrapper, 'Oops! Missed the green zone.');
        setTimeout(() => {
          tapBtn.style.animation = '';
          tapBtn.style.background = 'var(--accent)';
        }, 450);
      }
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(track);
    wrapper.appendChild(tapBtn);

    return {
      type: 'Timing Test',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 20: Quick Product multiplication ──────────────────
  function makeQuickProductChallenge() {
    const expressions = [
      { q: '6 x 7', a: 42, list: [36, 42, 48, 40] },
      { q: '8 x 4', a: 32, list: [28, 36, 32, 30] },
      { q: '9 x 5', a: 45, list: [40, 45, 50, 48] },
      { q: '7 x 9', a: 63, list: [56, 63, 70, 64] },
      { q: '12 x 4', a: 48, list: [44, 48, 52, 40] }
    ];
    const exp = expressions[randInt(0, expressions.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Calculate:<br><strong style="color:var(--accent); font-family:monospace; font-size:22px;">${exp.q}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    exp.list.forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = val;

      btn.addEventListener('click', () => {
        if (val === exp.a) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Check your multiplication.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Quick Math',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 21: Count Ascending Numbers ──────────────────────
  function makeFindNumberChallenge() {
    const list = [];
    while (list.length < 5) {
      const num = randInt(1, 99);
      if (!list.includes(num)) {
        list.push(num);
      }
    }
    const isAscending = Math.random() > 0.5;
    const targetOrder = [...list].sort((a, b) => isAscending ? (a - b) : (b - a));
    const scramble = [...list].sort(() => Math.random() - 0.5);
    let clicked = [];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = isAscending ? 'Click numbers in ascending order:' : 'Click numbers in descending order:';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 15px;';

    scramble.forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = val;

      btn.addEventListener('click', () => {
        if (btn.style.background === 'var(--accent)') return;

        const expected = targetOrder[clicked.length];
        if (val === expected) {
          clicked.push(val);
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';

          if (clicked.length === 5) {
            setTimeout(() => { if (onComplete) onComplete(); }, 500);
          }
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, isAscending ? 'Oops! Sort from smallest to largest.' : 'Oops! Sort from largest to smallest.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
            clicked = [];
            [...grid.children].forEach(b => {
              b.style.background = 'rgba(255,255,255,0.03)';
              b.style.color = 'var(--text)';
              b.style.borderColor = 'var(--border)';
              b.style.boxShadow = 'none';
            });
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Count Ascending',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 22: Unstrip Vowels ────────────────────────────────
  function makeVowelStripperChallenge() {
    const list = [
      { vowelless: 'PRDCTVTY', original: 'PRODUCTIVITY', opts: ['PROACTIVE', 'PERSISTENCE', 'PRODUCTIVITY', 'PROMOTION'] },
      { vowelless: 'TTNTN', original: 'ATTENTION', opts: ['ACTION', 'ATTENTION', 'ATTITUDE', 'ALTITUDE'] },
      { vowelless: 'DSCPLN', original: 'DISCIPLINE', opts: ['DISCIPLINE', 'DEVELOPMENT', 'DEDICATION', 'DIRECTION'] }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Reveal this word without vowels:<br><strong style="color:var(--accent); font-family:monospace; font-size:22px; letter-spacing:2px;">${item.vowelless}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;';

    item.opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 600; font-size:12px; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (opt === item.original) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That word has different consonants.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Text Unstrip',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 23: Verification Code typing ──────────────────────
  function makeTypingSpeedChallenge() {
    const codes = ['F0CUS5', 'SH1ELD', 'D1SC1P', 'M1NDFL', 'S1TENT'];
    const code = codes[randInt(0, codes.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Type verification code:<br><strong style="color:var(--accent); font-family:monospace; font-size:22px; letter-spacing:3px; text-shadow:0 0 8px rgba(61,220,132,0.3);">${code}</strong>`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'challenge-input';
    input.placeholder = 'Type code here...';
    input.style.textAlign = 'center';

    input.addEventListener('input', () => {
      const val = input.value.trim().toUpperCase();
      if (val === code) {
        input.disabled = true;
        input.style.borderColor = '#3ddc84';
        input.style.boxShadow = '0 0 12px rgba(61, 220, 132, 0.4)';
        setTimeout(() => { if (onComplete) onComplete(); }, 500);
      }
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(input);

    return {
      type: 'Verification Code',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 24: Rock Paper Scissors ───────────────────────────
  function makeRPSChallenge() {
    const choices = [
      { name: 'ROCK', beats: 'SCISSORS', icon: '✊' },
      { name: 'PAPER', beats: 'ROCK', icon: '✋' },
      { name: 'SCISSORS', beats: 'PAPER', icon: '✌️' }
    ];
    const compIdx = randInt(0, 2);
    const compChoice = choices[compIdx];

    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Beat computer! Computer plays:<br><strong style="color:#ef4444; font-size:24px;">${compChoice.icon} ${compChoice.name}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;';

    choices.forEach(userChoice => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); font-size: 20px; cursor: pointer; transition: all 0.2s;';
      btn.textContent = userChoice.icon;
      btn.title = userChoice.name;

      btn.addEventListener('click', () => {
        if (userChoice.beats === compChoice.name) {
          btn.style.background = 'var(--accent)';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That loses or ties. Try to beat the computer!');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Rock Paper Scissors',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 25: Color Mix Challenge ───────────────────────────
  function makeColorMixChallenge() {
    const list = [
      { colors: 'Red + Blue', res: 'Purple', opts: ['Green', 'Orange', 'Purple', 'Pink'] },
      { colors: 'Yellow + Blue', res: 'Green', opts: ['Green', 'Orange', 'Purple', 'Brown'] },
      { colors: 'Red + Yellow', res: 'Orange', opts: ['Green', 'Orange', 'Purple', 'Pink'] }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Mix color:<br><strong style="color:var(--accent); font-size:18px;">${item.colors}</strong>?`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;';

    item.opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 600; font-size:12.5px; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (opt === item.res) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Those colors combine differently.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Color Mix',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 26: Arrow Direction Match ────────────────────────
  function makeDirectionChallenge() {
    const list = [
      { arrow: '←', label: 'LEFT', correct: true },
      { arrow: '→', label: 'LEFT', correct: false },
      { arrow: '↑', label: 'UP', correct: true },
      { arrow: '↓', label: 'UP', correct: false },
      { arrow: '→', label: 'RIGHT', correct: true },
      { arrow: '←', label: 'RIGHT', correct: false }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Is this label correct for the arrow?<br><span style="font-size:32px; display:block; margin:8px 0; color:var(--accent);">${item.arrow}</span><strong>${item.label}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px;';

    [true, false].forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = choice ? 'CORRECT' : 'INCORRECT';

      btn.addEventListener('click', () => {
        if (choice === item.correct) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Match direction to the text label.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Arrow Match',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 27: Math Inequality logic ────────────────────────
  function makeMathInequalityChallenge() {
    const list = [
      { expr: '14 + 7 > 20', correct: true },
      { expr: '3 x 8 < 22', correct: false },
      { expr: '19 - 8 == 11', correct: true },
      { expr: '25 / 5 > 6', correct: false },
      { expr: '6 x 6 >= 36', correct: true }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.innerHTML = `Is this math statement True or False?<br><strong style="color:var(--accent); font-family:monospace; font-size:22px; display:block; margin:10px 0;">${item.expr}</strong>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px;';

    [true, false].forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = choice ? 'TRUE' : 'FALSE';

      btn.addEventListener('click', () => {
        if (choice === item.correct) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Check the math statement logic.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Inequality Logic',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 28: Descending Letters ───────────────────────────
  function makeDescendingLettersChallenge() {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    const selected = [];
    while (selected.length < 4) {
      const char = letters[randInt(0, letters.length - 1)];
      if (!selected.includes(char)) selected.push(char);
    }
    const targetOrder = [...selected].sort().reverse();
    const scramble = [...selected].sort(() => Math.random() - 0.5);

    let clicked = [];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Click letters in reverse alphabetical order:';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    scramble.forEach(char => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;';
      btn.textContent = char;

      btn.addEventListener('click', () => {
        if (btn.style.background === 'var(--accent)') return;

        const expected = targetOrder[clicked.length];
        if (char === expected) {
          clicked.push(char);
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';

          if (clicked.length === 4) {
            setTimeout(() => { if (onComplete) onComplete(); }, 500);
          }
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! Follow reverse alphabetical order.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
            clicked = [];
            [...grid.children].forEach(b => {
              b.style.background = 'rgba(255,255,255,0.03)';
              b.style.color = 'var(--text)';
              b.style.borderColor = 'var(--border)';
              b.style.boxShadow = 'none';
            });
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Reverse Letters',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 29: Odd Symbol Match ─────────────────────────────
  function makeOddSymbolChallenge() {
    const list = [
      { syms: ['●', '●', '●', '▲', '●'], odd: '▲' },
      { syms: ['★', '★', '☆', '★', '★'], odd: '☆' },
      { syms: ['■', '■', '⬔', '■', '■'], odd: '⬔' },
      { syms: ['◆', '◇', '◆', '◆', '◆'], odd: '◇' }
    ];
    const item = list[randInt(0, list.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Click the odd symbol out:';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 15px;';

    item.syms.forEach(sym => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.03); color: var(--text); font-size: 18px; cursor: pointer; transition: all 0.2s;';
      btn.textContent = sym;

      btn.addEventListener('click', () => {
        if (sym === item.odd) {
          btn.style.background = 'var(--accent)';
          btn.style.color = '#000000';
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 10px var(--accent)';
          setTimeout(() => { if (onComplete) onComplete(); }, 500);
        } else {
          btn.style.animation = 'shake 0.35s ease';
          btn.style.background = '#ef444425';
          btn.style.borderColor = '#ef4444';
          showWrongFeedback(wrapper, 'Oops! That symbol matches the others.');
          setTimeout(() => {
            btn.style.animation = '';
            btn.style.background = 'rgba(255,255,255,0.03)';
            btn.style.borderColor = 'var(--border)';
          }, 450);
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Odd Symbol',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 30: Card Memory Match ────────────────────────────
  function makeMatchPairsChallenge() {
    const cards = [
      { id: 1, val: 'A', icon: '🔥' },
      { id: 2, val: 'A', icon: '🔥' },
      { id: 3, val: 'B', icon: '💡' },
      { id: 4, val: 'B', icon: '💡' }
    ];
    const scramble = [...cards].sort(() => Math.random() - 0.5);
    let firstCard = null;
    let matchCount = 0;
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'challenge-card';

    const instr = document.createElement('p');
    instr.className = 'challenge-question';
    instr.textContent = 'Match both pairs of hidden cards:';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;';

    scramble.forEach(card => {
      const btn = document.createElement('button');
      btn.className = 'btn-platform-settings';
      btn.style.cssText = 'height: 50px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,0.08); font-size: 20px; color: transparent; cursor: pointer; transition: all 0.2s;';
      btn.textContent = '?';

      btn.addEventListener('click', () => {
        if (btn.style.background === 'var(--accent)' || btn === firstCard) return;

        // Reveal card
        btn.textContent = card.icon;
        btn.style.color = 'var(--text)';
        btn.style.background = 'rgba(255,255,255,0.02)';

        if (!firstCard) {
          firstCard = btn;
          firstCard.cardData = card;
        } else {
          const secondCard = btn;
          secondCard.cardData = card;

          if (firstCard.cardData.val === secondCard.cardData.val) {
            // Match found!
            firstCard.style.background = 'var(--accent)';
            firstCard.style.color = '#000000';
            firstCard.style.borderColor = 'var(--accent)';
            secondCard.style.background = 'var(--accent)';
            secondCard.style.color = '#000000';
            secondCard.style.borderColor = 'var(--accent)';

            matchCount++;
            firstCard = null;

            if (matchCount === 2) {
              setTimeout(() => { if (onComplete) onComplete(); }, 500);
            }
          } else {
            // No match, flip back
            secondCard.style.animation = 'shake 0.35s ease';
            secondCard.style.borderColor = '#ef4444';
            firstCard.style.animation = 'shake 0.35s ease';
            firstCard.style.borderColor = '#ef4444';
            showWrongFeedback(wrapper, 'Oops! Cards do not match.');

            const card1 = firstCard;
            firstCard = null;

            setTimeout(() => {
              card1.style.animation = '';
              card1.style.borderColor = 'var(--border)';
              card1.style.background = 'rgba(255,255,255,0.08)';
              card1.textContent = '?';
              card1.style.color = 'transparent';

              secondCard.style.animation = '';
              secondCard.style.borderColor = 'var(--border)';
              secondCard.style.background = 'rgba(255,255,255,0.08)';
              secondCard.textContent = '?';
              secondCard.style.color = 'transparent';
            }, 550);
          }
        }
      });
      grid.appendChild(btn);
    });

    wrapper.appendChild(instr);
    wrapper.appendChild(grid);

    return {
      type: 'Memory Match',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── GAME TYPE 31: Reflection Statement Challenge (FINAL) ───────
  const REFLECTION_STATEMENTS = [
    "Future me may wish I had stayed focused, but I still choose to unlock this website.",
    "I understand that unlocking this website may compromise my focus, but I still choose to continue.",
    "I blocked this website to protect my attention, and I am choosing to override that decision.",
    "I know one impulsive click can become hours of distraction, and I still choose to continue.",
    "I understand that this decision may pull me away from my goals, but I still choose to continue.",
    "I accept that unlocking this website could make it harder to regain my focus, and I still choose to continue.",
    "I know why I blocked this website, and I still choose to unlock it.",
    "I understand that my choices today shape my habits tomorrow, and I still choose to continue.",
    "I understand the consequences of this decision, and I accept full responsibility for it.",
    "I know staying focused would benefit me, but I still choose to unlock this website."
  ];

  function makeReflectionStatementChallenge() {
    const selectedStatement = REFLECTION_STATEMENTS[randInt(0, REFLECTION_STATEMENTS.length - 1)];
    let onComplete = null;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; gap:12px; font-family:inherit;';

    const header = document.createElement('p');
    header.style.cssText = 'font-size:12.5px; font-weight:700; color:#3ddc84; text-transform:uppercase; letter-spacing:0.06em; margin:0; text-align:center;';
    header.textContent = 'TYPE THIS EXACTLY';

    const promptBox = document.createElement('div');
    promptBox.className = 'unselectable-reflection-box';
    promptBox.style.cssText = `
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 13.5px;
      font-weight: 500;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.7);
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      text-align: left;
    `;

    function renderPromptText(typedText) {
      promptBox.innerHTML = '';
      for (let i = 0; i < selectedStatement.length; i++) {
        const span = document.createElement('span');
        const char = selectedStatement[i];
        span.textContent = char;
        span.style.fontWeight = '500';
        if (i < typedText.length) {
          if (typedText[i] === char) {
            span.style.color = '#3ddc84';
            span.style.textShadow = '0 0 6px rgba(61, 220, 132, 0.4)';
          } else {
            span.style.color = '#f87171';
          }
        } else {
          span.style.color = 'rgba(255, 255, 255, 0.7)';
        }
        promptBox.appendChild(span);
      }
    }

    renderPromptText('');

    ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(evt => {
      promptBox.addEventListener(evt, e => e.preventDefault());
    });

    const input = document.createElement('textarea');
    input.rows = 3;
    input.placeholder = 'Type the exact statement here...';
    input.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      color: #ffffff;
      outline: none;
      resize: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    `;

    ['paste', 'copy', 'cut', 'drop'].forEach(evt => {
      input.addEventListener(evt, e => {
        e.preventDefault();
        input.style.borderColor = '#ef4444';
        setTimeout(() => { input.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }, 400);
      });
    });

    const statusMessage = document.createElement('div');
    statusMessage.style.cssText = 'font-size:12.5px; font-weight:700; color:#3ddc84; text-align:center; min-height:18px; opacity:0; transition:opacity 0.2s ease; margin-top:-4px;';
    statusMessage.textContent = '✓ Statement Completed!';

    input.addEventListener('input', () => {
      const typed = input.value;
      renderPromptText(typed);

      if (typed === selectedStatement) {
        input.disabled = true;
        input.style.borderColor = '#3ddc84';
        input.style.boxShadow = '0 0 12px rgba(61, 220, 132, 0.4)';
        statusMessage.style.opacity = '1';
        setTimeout(() => { if (onComplete) onComplete(); }, 500);
      } else if (typed.length > 0 && !selectedStatement.startsWith(typed)) {
        input.style.borderColor = '#ef4444';
      } else {
        input.style.borderColor = 'rgba(61, 220, 132, 0.4)';
      }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(promptBox);
    wrapper.appendChild(input);
    wrapper.appendChild(statusMessage);

    return {
      type: 'Type Text',
      element: wrapper,
      onCompleteHook: fn => { onComplete = fn; }
    };
  }

  // ── 5. PICK RANDOM GAMES ───────────────────────────────────────
  const GAME_FACTORIES = [
    makeMovingTargetChallenge,
    makeMemorySequenceChallenge,
    makeRapidClickChallenge,
    makeStroopChallenge,
    makeSortingChallenge,
    makeOddOneOutChallenge,
    makeMathQuizChallenge,
    makeEvenNumbersChallenge,
    makeWordUnscrambleChallenge,
    makeFindColorChallenge,
    makeMirrorTextChallenge,
    makeVowelCounterChallenge,
    makePatternCompletionChallenge,
    makeAscendingLettersChallenge,
    makeSymbolCounterChallenge,
    makeCapitalCityChallenge,
    makePrimeNumberChallenge,
    makeRhythmTapChallenge,
    makeFindNumberChallenge,
    makeVowelStripperChallenge,
    makeRPSChallenge,
    makeColorMixChallenge,
    makeMathInequalityChallenge,
    makeDescendingLettersChallenge,
    makeOddSymbolChallenge
  ];

  const randomCount   = randInt(5, 8);
  const shuffled       = [...GAME_FACTORIES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  const gameFactories  = [...shuffled.slice(0, randomCount), makeReflectionStatementChallenge];
  const challengeCount = gameFactories.length;

  let currentIndex = 0;

  const challengeSection  = document.getElementById('challenge-section');
  const progressCountEl   = document.getElementById('progress-count');
  const progressFillEl    = document.getElementById('progress-fill');
  const cardContainer     = document.getElementById('challenge-card-container');
  const completionStateEl = document.getElementById('completion-state');

  function updateProgress() {
    if (progressCountEl) progressCountEl.textContent = `${currentIndex} / ${challengeCount}`;
    if (progressFillEl)  progressFillEl.style.width  = `${(currentIndex / challengeCount) * 100}%`;
    if (currentIndex >= challengeCount && progressFillEl) {
      progressFillEl.classList.add('complete');
    }
  }

  // ── 6. RENDER CHALLENGE ────────────────────────────────────────
  function renderChallenge(idx) {
    if (!cardContainer) return;
    cardContainer.innerHTML = '';
    currentWrongClickCount = 0; // Reset wrong click count for the new game!
    updateProgress();

    if (idx >= challengeCount) {
      showCompletion();
      return;
    }

    const gameFactory = gameFactories[idx];
    const game = gameFactory();

    const card = document.createElement('div');
    card.className = 'challenge-card';

    const badge = document.createElement('div');
    badge.className = 'challenge-type-badge';
    badge.textContent = game.type;

    card.appendChild(badge);
    card.appendChild(game.element);
    cardContainer.appendChild(card);

    // Wire completion
    game.onCompleteHook(() => {
      currentIndex++;
      setTimeout(() => renderChallenge(currentIndex), 300);
    });
  }

  // ── 7. SHOW COMPLETION ─────────────────────────────────────────
  function showCompletion() {
    clearInterval(countdownInterval);
    if (cardContainer)     cardContainer.style.display  = 'none';
    if (completionStateEl) completionStateEl.classList.add('active');
    updateProgress();

    const onUnlockDone = () => {
      const redirectEl = document.getElementById('completion-redirect');
      let count = 3;
      if (redirectEl) redirectEl.textContent = `Redirecting you back in ${count}s...`;

      const timer = setInterval(() => {
        count--;
        if (redirectEl) redirectEl.textContent = `Redirecting you back in ${count}s...`;
        if (count <= 0) {
          clearInterval(timer);
          window.location.href = originalUrl;
        }
      }, 1000);
    };

    if (isFilterType) {
      addFilterBypass(targetDomain, onUnlockDone);
    } else {
      removeHardBlock(blockedSite, onUnlockDone);
    }
  }

  // ── 8. UNLOCK EARLY BUTTON ─────────────────────────────────────
  const unlockBtn = document.getElementById('unlock-early-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => {
      unlockBtn.style.opacity    = '0';
      unlockBtn.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        unlockBtn.style.display = 'none';
        const divider = document.querySelector('.section-divider');
        if (divider) divider.style.display = 'none';
        if (challengeSection) {
          challengeSection.classList.add('active');
          updateProgress();
          renderChallenge(0);
        }
      }, 300);
    });
  }

});
