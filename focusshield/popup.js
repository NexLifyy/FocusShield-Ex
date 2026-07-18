document.addEventListener('DOMContentLoaded', () => {
  // Set version string from manifest
  try {
    const manifest = chrome.runtime.getManifest();
    document.querySelectorAll('.version').forEach(el => {
      el.textContent = `v${manifest.version}`;
    });
  } catch (e) {}

  const defaultSettings = {
    masterToggle: true,
    youtube: {
      enabled: false,
      blockFullSite: false,
      sidebar: true,
      comments: true,
      feed: true,
      shorts: true,
      autoplay: true
    },
    facebook: {
      enabled: false,
      blockFullSite: false,
      feed: true,
      stories: true,
      notifications: true,
      reels: true,
      messenger: true,
      comments: true,
      friends: true,
      groups: true,
      pages: true
    },
    instagram: {
      enabled: false,
      blockFullSite: false,
      feed: true,
      reels: true,
      explore: true,
      stories: true,
      sponsored: true,
      shopping: true,
      messages: true,
      notifications: true,
      comments: true
    },
    reddit: {
      enabled: false,
      blockFullSite: false,
      promoted: true,
      communities: true,
      search: true,
      premium: true,
      trending: true,
      popularAll: true,
      commentsSection: true,
      chatDMs: true
    },
    tiktok: {
      enabled: false,
      blockFullSite: false,
      foryou: true,
      following: true,
      suggested: true,
      live: true,
      shop: true,
      badges: true,
      comments: true,
      search: true,
      upload: true
    },
    twitter: {
      enabled: false,
      blockFullSite: false,
      trending: true,
      whotofollow: true,
      promoted: true,
      spaces: true,
      messages: true,
      explore: true,
      communities: true,
      notifications: true,
      premium: true,
      feed: true
    },
    customSites: [],
    hardBlockedSites: [],
    schedules: [],
    iconBadgeEnabled: true,
    filterAdult: false,
    filterGaming: false,
    filterShopping: false,
    filterGambling: false,
    filterStreaming: false,
    filterBypasses: {},
    focusStats: {
      streakDays: 0,
      lastActiveDate: '',
      totalSessionsCompleted: 0,
      timeSavedMinutes: 0,
      siteBlockCounts: {},
      dailyLogs: {},
      dailyFocusGoal: 4
    }
  };

  let settings = { ...defaultSettings };
  let currentSiteHostname = '';
  let currentSiteBlockType = '';
  let currentSiteBlockCategory = '';
  let currentDetailPlatform = '';

  const platformOptionsDef = {
    youtube: [
      { key: 'sidebar', label: 'Sidebar recommendations' },
      { key: 'comments', label: 'Comments section' },
      { key: 'feed', label: 'Homepage video feed' },
      { key: 'shorts', label: 'Shorts shelf' },
      { key: 'autoplay', label: 'Autoplay next video' }
    ],
    facebook: [
      { key: 'feed', label: 'News feed' },
      { key: 'stories', label: 'Stories bar' },
      { key: 'notifications', label: 'Notification badges' },
      { key: 'reels', label: 'Reels section' },
      { key: 'messenger', label: 'Messenger chat' },
      { key: 'comments', label: 'Comments section' },
      { key: 'friends', label: 'Block Friends' },
      { key: 'groups', label: 'Block Groups' },
      { key: 'pages', label: 'Block Pages' }
    ],
    instagram: [
      { key: 'feed', label: 'Home Feed' },
      { key: 'reels', label: 'Reels tab' },
      { key: 'explore', label: 'Explore page' },
      { key: 'stories', label: 'Stories bar' },
      { key: 'sponsored', label: 'Sponsored posts' },
      { key: 'shopping', label: 'Shopping tab' },
      { key: 'messages', label: 'Block Direct Messages' },
      { key: 'notifications', label: 'Block Notifications' },
      { key: 'comments', label: 'Block Comments Section' }
    ],
    reddit: [
      { key: 'promoted', label: 'Promoted posts' },
      { key: 'communities', label: 'Communities list' },
      { key: 'search', label: 'Search Box' },
      { key: 'premium', label: 'Premium banners' },
      { key: 'trending', label: 'Trending communities' },
      { key: 'popularAll', label: 'Popular & All feeds' },
      { key: 'commentsSection', label: 'Block Comment Sections' },
      { key: 'chatDMs', label: 'Block Chat / DMs' }
    ],
    tiktok: [
      { key: 'foryou', label: 'For you feed' },
      { key: 'following', label: 'Following feed' },
      { key: 'suggested', label: 'Suggested accounts' },
      { key: 'live', label: 'Live section' },
      { key: 'shop', label: 'Shop tab' },
      { key: 'badges', label: 'Notification badges' },
      { key: 'comments', label: 'Comments section' },
      { key: 'search', label: 'Search bar / Results' },
      { key: 'upload', label: 'Upload / Create button' }
    ],
    twitter: [
      { key: 'feed', label: 'Home Feed' },
      { key: 'trending', label: 'Trending topics' },
      { key: 'whotofollow', label: 'Who to follow' },
      { key: 'promoted', label: 'Promoted tweets' },
      { key: 'spaces', label: 'Spaces bar' },
      { key: 'messages', label: 'Block Messages' },
      { key: 'explore', label: 'Explore Tab / Search Feed' },
      { key: 'communities', label: 'Communities' },
      { key: 'notifications', label: 'Notifications' },
      { key: 'premium', label: 'Hide Premium Banners' }
    ]
  };

  // Element mappings to HTML elements
  const elements = {
    masterToggle: document.getElementById('master-toggle'),
    masterStatus: document.getElementById('master-status'),
    customSitesList: document.getElementById('custom-sites-list')
  };

  // Helper: Get domain matching a platform key
  function getDomainFromPlatform(platform) {
    switch (platform) {
      case 'youtube': return 'youtube.com';
      case 'facebook': return 'facebook.com';
      case 'twitter': return 'twitter.com';
      case 'reddit': return 'reddit.com';
      case 'instagram': return 'instagram.com';
      case 'tiktok': return 'tiktok.com';
      default: return '';
    }
  }

  function getActiveBlockedSitesCount() {
    const now = Date.now();
    const hardList = settings.hardBlockedSites || [];
    const activeDomains = new Set();
    hardList.forEach(s => {
      if (s.expiresAt && now < s.expiresAt) {
        const normalized = s.domain.toLowerCase().replace(/^www\./, '');
        if (normalized) {
          activeDomains.add(normalized);
        }
      }
    });
    return activeDomains.size;
  }

  // Helper: Finalize focus session for one or more domains.
  // Saves current accumulated time as "lastSecs", resets session.
  function finalizeSession(domains) {
    if (!domains || domains.length === 0) return;
    const STATS_KEY = 'focusStats';
    chrome.storage.local.get(STATS_KEY, (result) => {
      const allStats = result[STATS_KEY] || {};
      const now = Date.now();
      let changed = false;
      domains.forEach(domain => {
        if (!domain) return;
        const entry = allStats[domain];
        if (!entry || !entry.sessionStart) return;
        const elapsed = Math.floor((now - entry.sessionStart) / 1000);
        const total = (entry.priorSecs || 0) + elapsed;
        allStats[domain] = {
          sessionStart: null,
          priorSecs: 0,
          lastSecs: total
        };
        changed = true;
      });
      if (changed) chrome.storage.local.set({ [STATS_KEY]: allStats });
    });
  }

  // Helper: Reload tab if it is on the target custom site
  function reloadTabIfOnDomain(domain) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        try {
          const urlObj = new URL(tabs[0].url);
          const hostname = urlObj.hostname.toLowerCase();
          const targetDomain = domain.toLowerCase();
          
          let matches = false;
          if (hostname === targetDomain || hostname.endsWith('.' + targetDomain)) {
            matches = true;
          } else if (targetDomain === 'twitter.com' && (hostname === 'x.com' || hostname.endsWith('.x.com'))) {
            matches = true;
          } else if (urlObj.protocol.startsWith('chrome-extension') && urlObj.pathname.includes('hard-blocked.html')) {
            const params = new URLSearchParams(urlObj.search);
            const siteParam = params.get('site') || '';
            if (siteParam.toLowerCase() === targetDomain || siteParam.toLowerCase().endsWith('.' + targetDomain)) {
              matches = true;
            } else if (targetDomain === 'twitter.com' && (siteParam.toLowerCase() === 'x.com' || siteParam.toLowerCase().endsWith('.x.com'))) {
              matches = true;
            }
          }
          
          if (matches) {
            if (urlObj.protocol.startsWith('chrome-extension') && urlObj.pathname.includes('hard-blocked.html')) {
              // Redirect blocked page back to original URL
              const params = new URLSearchParams(urlObj.search);
              const originalUrl = params.get('originalUrl') || ('https://' + targetDomain);
              chrome.tabs.update(tabs[0].id, { url: originalUrl });
            } else {
              chrome.tabs.reload(tabs[0].id);
            }
          }
        } catch (e) {
          console.error('Error reloading tab for domain:', e);
        }
      }
    });
  }

  function mergeWithDefaults(stored) {
    const merged = { ...defaultSettings };
    if (stored) {
      if (stored.masterToggle !== undefined) merged.masterToggle = stored.masterToggle;
      const platforms = ['youtube', 'facebook', 'instagram', 'reddit', 'tiktok', 'twitter'];
      platforms.forEach(p => {
        if (stored[p] && typeof stored[p] === 'object') {
          merged[p] = { ...defaultSettings[p], ...stored[p] };
          if (p === 'reddit' && merged[p].awards !== undefined) {
            delete merged[p].awards;
          }
        }
      });
      if (Array.isArray(stored.customSites)) merged.customSites = stored.customSites;
      if (Array.isArray(stored.hardBlockedSites)) merged.hardBlockedSites = stored.hardBlockedSites;
      if (Array.isArray(stored.schedules)) merged.schedules = stored.schedules;
      if (stored.previousPlatformStates) merged.previousPlatformStates = stored.previousPlatformStates;
      if (stored.previousCustomSiteStates) merged.previousCustomSiteStates = stored.previousCustomSiteStates;
      if (stored.iconBadgeEnabled !== undefined) merged.iconBadgeEnabled = stored.iconBadgeEnabled;
      if (stored.filterAdult !== undefined) merged.filterAdult = stored.filterAdult;
      if (stored.filterGaming !== undefined) merged.filterGaming = stored.filterGaming;
      if (stored.filterShopping !== undefined) merged.filterShopping = stored.filterShopping;
      if (stored.filterGambling !== undefined) merged.filterGambling = stored.filterGambling;
      if (stored.filterStreaming !== undefined) merged.filterStreaming = stored.filterStreaming;
      if (stored.filterBypasses && typeof stored.filterBypasses === 'object') {
        merged.filterBypasses = stored.filterBypasses;
      }
      if (stored.focusStats && typeof stored.focusStats === 'object') {
        merged.focusStats = { ...defaultSettings.focusStats, ...stored.focusStats };
      }
    }
    return merged;
  }

  function triggerEmberSparksAnimation() {
    const pill = document.getElementById('btn-show-insights');
    if (!pill) return;

    const rect = pill.getBoundingClientRect();
    const count = 5;

    for (let i = 0; i < count; i++) {
      const ember = document.createElement('div');
      ember.className = 'ember-spark';

      const startX = rect.left + rect.width / 2 + (Math.random() * 20 - 10);
      const startY = rect.top + rect.height / 2;

      const dx = (Math.random() * 30 - 15) + 'px';
      const dy = -(25 + Math.random() * 30) + 'px';

      ember.style.left = startX + 'px';
      ember.style.top = startY + 'px';
      ember.style.setProperty('--ember-dx', dx);
      ember.style.setProperty('--ember-dy', dy);
      ember.style.animationDelay = (i * 0.06) + 's';

      document.body.appendChild(ember);

      setTimeout(() => {
        if (ember.parentNode) ember.parentNode.removeChild(ember);
      }, 1000);
    }
  }

  function recordActiveFocusDay() {
    if (!settings.focusStats) {
      settings.focusStats = { streakDays: 0, lastActiveDate: '' };
    }
    const stats = settings.focusStats;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let streakIncremented = false;

    if (!stats.lastActiveDate) {
      stats.lastActiveDate = todayStr;
      stats.streakDays = 1;
      streakIncremented = true;
    } else if (stats.lastActiveDate !== todayStr) {
      const lastDate = new Date(stats.lastActiveDate);
      const diffTime = now.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        stats.streakDays = (stats.streakDays || 0) + 1;
      } else {
        stats.streakDays = 1;
      }
      stats.lastActiveDate = todayStr;
      streakIncremented = true;
    } else if (stats.streakDays === 0) {
      stats.streakDays = 1;
      streakIncremented = true;
    }

    chrome.storage.local.set({ focusStats: stats });

    const headerStreakEl = document.getElementById('header-streak-count');
    if (headerStreakEl) {
      headerStreakEl.textContent = stats.streakDays !== undefined ? stats.streakDays : 0;
    }

    const pill = document.getElementById('streak-pill-header');
    if (pill) {
      if (stats.streakDays > 0) {
        pill.classList.add('active-streak');
      } else {
        pill.classList.remove('active-streak');
      }
    }

    if (streakIncremented) {
      triggerEmberSparksAnimation();
    }
  }

  function updateFocusStatsUI() {
    if (!settings.focusStats) {
      settings.focusStats = { streakDays: 0, lastActiveDate: '' };
    }
    const stats = settings.focusStats;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const hardSites = settings.hardBlockedSites || [];
    const hasActiveBlock = hardSites.some(s => s.expiresAt > Date.now());
    if (hasActiveBlock) {
      recordActiveFocusDay();
      return;
    }

    if (stats.lastActiveDate && stats.lastActiveDate !== todayStr) {
      const lastDate = new Date(stats.lastActiveDate);
      const diffTime = now.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays > 1) {
        stats.streakDays = 0;
        chrome.storage.local.set({ focusStats: stats });
      }
    }

    const headerStreakEl = document.getElementById('header-streak-count');
    if (headerStreakEl) {
      headerStreakEl.textContent = stats.streakDays !== undefined ? stats.streakDays : 0;
    }

    const pill = document.getElementById('streak-pill-header');
    if (pill) {
      if ((stats.streakDays || 0) > 0) {
        pill.classList.add('active-streak');
      } else {
        pill.classList.remove('active-streak');
      }
    }
  }

  // 1. STARTUP: Load settings from storage
  chrome.storage.local.get(null, async (result) => {
    settings = mergeWithDefaults(result);
    const { hardBlockedSites, ...settingsWithoutHB } = settings;
    chrome.storage.local.set(settingsWithoutHB);
    
    // Check premium status & initialize banners
    await checkPremiumStatus();
    updateTrialBanner();
    updateAccountUI();

    applySettingsToUI();
    updateFocusStatsUI();
    detectCurrentSite();
    startGlobalPopupTimer();
    renderSchedules();

    // ── CHECK AND TRIGGER SYNC / LOGOUT POPUPS ──
    const current = result.sessionUser || null;
    const lastSeen = result.lastSeenSession || null;

    // Save/update the lastSeenSession state for the next check
    const nextLastSeen = current ? { uid: current.uid, isPremium: !!current.isPremium } : { uid: null, isPremium: false };
    chrome.storage.local.set({ lastSeenSession: nextLastSeen });

    if (lastSeen) {
      if (lastSeen.uid && !current) {
        // User logged out
        if (lastSeen.isPremium) {
          showSyncModal('pro-logout');
        } else {
          showSyncModal('free-logout');
        }
      } else if ((!lastSeen.uid || lastSeen.uid !== current?.uid) && current) {
        // User logged in
        showSyncModal('pro-login');
      }
    } else {
      // If lastSeen doesn't exist, this is first load after install/update
      // If user is already logged in, show restoring data modal just in case
      if (current) {
        showSyncModal('pro-login');
      }
    }
  });

  // Apply settings properties to UI controls
  function applySettingsToUI() {
    updateFocusStatsUI();
    // Platforms master switches
    const platformsList = ['youtube', 'facebook', 'twitter', 'reddit', 'instagram', 'tiktok'];
    platformsList.forEach(p => {
      const toggleInput = document.getElementById(`toggle-${p}`);
      if (toggleInput) {
        toggleInput.checked = settings[p] && settings[p].enabled !== false;
        toggleInput.disabled = false;
      }
      const settingsBtn = document.getElementById(`settings-${p}`);
      if (settingsBtn) {
        settingsBtn.disabled = false;
        settingsBtn.classList.remove('disabled-btn');
      }
    });
    
    if (elements.customSitesList) {
      elements.customSitesList.classList.remove('disabled-container');
    }
    const footer = document.getElementById('custom-sites-footer');
    if (footer) footer.classList.remove('disabled-container');

    // Set settings switches state
    const iconBadgeSwitch = document.getElementById('setting-icon-badge');
    if (iconBadgeSwitch) {
      iconBadgeSwitch.checked = settings.iconBadgeEnabled !== false;
    }

    const filtersList = ['adult', 'gaming', 'shopping', 'gambling', 'streaming'];
    filtersList.forEach(f => {
      const switchEl = document.getElementById(`filter-${f}`);
      if (switchEl) {
        switchEl.checked = settings[`filter${f.charAt(0).toUpperCase() + f.slice(1)}`] === true;
      }
    });
    // Custom sites list
    renderCustomSites();
  }

  // Update master toggle status label style/text
  function updateMasterStatusText(enabled) {
    if (!elements.masterStatus) return;
    if (enabled) {
      elements.masterStatus.textContent = 'Active';
      elements.masterStatus.className = 'status-active';
    } else {
      elements.masterStatus.textContent = 'Paused';
      elements.masterStatus.className = 'status-paused';
    }
  }

  // Save settings state and broadcast to active tabs
  // NOTE: hardBlockedSites is intentionally excluded — it is managed
  // exclusively by setHardBlock() and removeHardBlockEntry().
  function saveSettings() {
    const { hardBlockedSites, ...settingsToSave } = settings;
    chrome.storage.local.set(settingsToSave, () => {
      // Broadcast settings update to content.js on the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          if (settings.masterToggle) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'SETTINGS_UPDATED',
              settings: settings
            }).catch(() => {});
          } else {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'MASTER_OFF'
            }).catch(() => {});
          }
        }
      });
      // ── AUTO BACKUP FOR LOGGED IN USERS ──
      authService.getCurrentUser().then((user) => {
        if (user) {
          syncService.backupSettings().then((res) => {
            if (res.success) {
              console.log('[Sync] Auto-backed up settings successfully.');
            } else {
              console.warn('[Sync] Auto-backup failed:', res.error);
            }
          });
        }
      });
    });
  }

  // 2. MASTER TOGGLE LISTENERS
  if (elements.masterToggle) {
    elements.masterToggle.addEventListener('change', () => {
      settings.masterToggle = elements.masterToggle.checked;
      updateMasterStatusText(settings.masterToggle);
      
      const platformsList = ['youtube', 'facebook', 'twitter', 'reddit', 'instagram', 'tiktok'];
      
      if (!settings.masterToggle) {
        // Save current states of platforms
        const states = {};
        platformsList.forEach(p => {
          states[p] = settings[p] ? (settings[p].enabled !== false) : true;
          if (settings[p]) {
            settings[p].enabled = false;
          }
        });
        settings.previousPlatformStates = states;

        // Save and turn off custom sites
        const customStates = {};
        if (Array.isArray(settings.customSites)) {
          settings.customSites.forEach(site => {
            customStates[site.id] = site.enabled !== false;
            site.enabled = false;
          });
        }
        settings.previousCustomSiteStates = customStates;
      } else {
        // Restore saved states if they exist
        const states = settings.previousPlatformStates || {};
        platformsList.forEach(p => {
          if (settings[p]) {
            settings[p].enabled = states[p] !== false;
          }
        });

        // Restore custom sites
        const customStates = settings.previousCustomSiteStates || {};
        if (Array.isArray(settings.customSites)) {
          settings.customSites.forEach(site => {
            site.enabled = customStates[site.id] !== false;
          });
        }
      }
      
      saveSettings();
      applySettingsToUI();
    });
  }

  // 3. PLATFORM MASTER SWITCH LISTENERS
  const platformMasterSwitches = document.querySelectorAll('.platform-master-toggle');
  platformMasterSwitches.forEach(toggle => {
    toggle.addEventListener('change', () => {
      const platform = toggle.dataset.platform;
      if (!isPremiumActive && toggle.checked) {
        const activePlatformsCount = ['youtube', 'facebook', 'twitter', 'reddit', 'instagram', 'tiktok'].filter(p => {
          return settings[p] && settings[p].enabled === true;
        }).length;
        if (activePlatformsCount >= 1) {
          toggle.checked = false;
          showPaywall('platform', "You've Hit Your Social Platform Limit", "The free plan allows managing <strong style='color: var(--accent); font-weight: 800;'>1 social platform</strong> at a time. Upgrade to Pro to manage Social Platforms simultaneously.");
          return;
        }
      }
      if (settings[platform]) {
        settings[platform].enabled = toggle.checked;
        
        // Update detail view toggle state if it is currently open
        if (document.getElementById('views-container').classList.contains('slide-to-detail') && currentDetailPlatform === platform) {
          const detailToggle = document.getElementById('detail-platform-toggle');
          if (detailToggle) detailToggle.checked = toggle.checked;
        }

        saveSettings();
        
        if (!toggle.checked) {
          finalizeSession([getDomainFromPlatform(platform)]);
          reloadTabIfOnDomain(getDomainFromPlatform(platform));
        }
      }
    });
  });

  // 4. PLATFORM SETTINGS CLICK -> NAVIGATION TO DETAIL VIEW
  const settingsButtons = document.querySelectorAll('.btn-platform-settings');
  settingsButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platform = btn.dataset.platform;
      openPlatformDetailView(platform);
    });
  });

  // Back Button Navigation
  document.getElementById('btn-back-to-main').addEventListener('click', () => {
    const backText = document.getElementById('detail-back-text');
    if (backText && backText.textContent === 'Back to Settings') {
      const nameSpan = document.getElementById('detail-platform-name');
      if (nameSpan) nameSpan.textContent = 'Settings';

      const detailIcon = document.getElementById('detail-platform-icon');
      if (detailIcon) {
        detailIcon.style.display = 'flex';
        detailIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(61,220,132,0.3));">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        `;
      }

      backText.textContent = 'Back to Home';
      document.getElementById('subview-platform-options').style.display = 'none';
      document.getElementById('subview-insights').style.display = 'none';
      document.getElementById('subview-settings').style.display = 'flex';
      document.getElementById('subview-account').style.display = 'none';
      return;
    }

    document.getElementById('views-container').classList.remove('slide-to-detail');
    // Clear selection highlighting
    document.querySelectorAll('.platform-row').forEach(r => {
      r.classList.remove('row-selected');
    });
  });

  // Open and render specific platform details panel
  function openPlatformDetailView(platform) {
    currentDetailPlatform = platform;
    renderPlatformDetailView(platform);

    const toggleWrapper = document.getElementById('detail-platform-toggle-wrapper');
    if (toggleWrapper) toggleWrapper.style.display = 'block';

    const detailIcon = document.getElementById('detail-platform-icon');
    if (detailIcon) detailIcon.style.display = 'flex';

    const backText = document.getElementById('detail-back-text');
    if (backText) backText.textContent = 'Back to Platforms';

    document.getElementById('subview-platform-options').style.display = 'flex';
    document.getElementById('subview-insights').style.display = 'none';
    document.getElementById('subview-settings').style.display = 'none';
    document.getElementById('subview-account').style.display = 'none';
    
    // Highlight selected platform row
    document.querySelectorAll('.platform-row').forEach(r => {
      r.classList.remove('row-selected');
    });
    const clickedRow = document.getElementById('row-' + platform);
    if (clickedRow) {
      clickedRow.classList.add('row-selected');
    }

    document.getElementById('views-container').classList.add('slide-to-detail');
  }

  // 4b. INSIGHTS AND SETTINGS TOP HEADER BUTTONS
  const btnShowInsights = document.getElementById('btn-show-insights');
  if (btnShowInsights) {
    btnShowInsights.addEventListener('click', () => {
      const nameSpan = document.getElementById('detail-platform-name');
      if (nameSpan) nameSpan.textContent = 'Insights';

      const detailIcon = document.getElementById('detail-platform-icon');
      if (detailIcon) {
        detailIcon.style.display = 'flex';
        detailIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(61,220,132,0.3));">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        `;
      }

      const toggleWrapper = document.getElementById('detail-platform-toggle-wrapper');
      if (toggleWrapper) toggleWrapper.style.display = 'none';

      const backText = document.getElementById('detail-back-text');
      if (backText) backText.textContent = 'Back to Home';

      document.getElementById('subview-platform-options').style.display = 'none';
      document.getElementById('subview-insights').style.display = 'flex';
      document.getElementById('subview-settings').style.display = 'none';
      document.getElementById('subview-account').style.display = 'none';

      renderInsights();

      document.getElementById('views-container').classList.add('slide-to-detail');
    });
  }

  const btnShowSettings = document.getElementById('btn-show-settings');
  if (btnShowSettings) {
    btnShowSettings.addEventListener('click', () => {
      const nameSpan = document.getElementById('detail-platform-name');
      if (nameSpan) nameSpan.textContent = 'Settings';

      const detailIcon = document.getElementById('detail-platform-icon');
      if (detailIcon) {
        detailIcon.style.display = 'flex';
        detailIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(61,220,132,0.3));">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        `;
      }

      const toggleWrapper = document.getElementById('detail-platform-toggle-wrapper');
      if (toggleWrapper) toggleWrapper.style.display = 'none';

      const backText = document.getElementById('detail-back-text');
      if (backText) backText.textContent = 'Back to Home';

      document.getElementById('subview-platform-options').style.display = 'none';
      document.getElementById('subview-insights').style.display = 'none';
      document.getElementById('subview-settings').style.display = 'flex';
      document.getElementById('subview-account').style.display = 'none';

      document.getElementById('views-container').classList.add('slide-to-detail');
    });
  }

  const btnClearStats = document.getElementById('btn-clear-stats');
  if (btnClearStats) {
    btnClearStats.addEventListener('click', () => {
      if (btnClearStats.textContent.trim() === 'Reset') {
        btnClearStats.textContent = 'Confirm?';
        btnClearStats.style.background = '#ef4444';
        btnClearStats.style.color = '#ffffff';
        btnClearStats.style.borderColor = '#ef4444';
        
        btnClearStats.timeoutId = setTimeout(() => {
          btnClearStats.textContent = 'Reset';
          btnClearStats.style.background = 'rgba(239, 68, 68, 0.12)';
          btnClearStats.style.color = '#ef4444';
          btnClearStats.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        }, 3000);
      } else {
        if (btnClearStats.timeoutId) clearTimeout(btnClearStats.timeoutId);
        
        chrome.storage.local.clear(() => {
          chrome.storage.local.set(defaultSettings, () => {
            showToast('All FocusShield data cleared', 'success');
            settings = mergeWithDefaults(defaultSettings);
            applySettingsToUI();
            renderInsights();
            renderSchedules();
            
            btnClearStats.textContent = 'Reset';
            btnClearStats.style.background = 'rgba(239, 68, 68, 0.12)';
            btnClearStats.style.color = '#ef4444';
            btnClearStats.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          });
        });
      }
    });
  }

  // Backup & Restore: Export Settings
  const btnExportSettings = document.getElementById('btn-export-settings');
  if (btnExportSettings) {
    btnExportSettings.addEventListener('click', () => {
      chrome.storage.local.get(null, (result) => {
        const exportData = mergeWithDefaults(result);
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focusshield-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Settings exported!', 'success');
      });
    });
  }

  // Backup & Restore: Import Settings
  const btnImportSettings = document.getElementById('btn-import-settings');
  const importFileInput = document.getElementById('import-file-input');
  if (btnImportSettings && importFileInput) {
    btnImportSettings.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', () => {
      if (importFileInput.files.length > 0) {
        const file = importFileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target.result);
            if (typeof imported !== 'object' || imported === null) {
              showToast('Invalid settings file format.');
              return;
            }
            
            // Overwrite storage
            chrome.storage.local.set(imported, () => {
              showToast('Settings imported successfully!', 'success');
              settings = mergeWithDefaults(imported);
              applySettingsToUI();
              renderInsights();
              renderSchedules();
              // Reset file input
              importFileInput.value = '';
            });
          } catch (err) {
            showToast('Error reading settings file.');
            console.error(err);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Settings switches listeners
  const iconBadgeSwitch = document.getElementById('setting-icon-badge');
  if (iconBadgeSwitch) {
    iconBadgeSwitch.addEventListener('change', () => {
      settings.iconBadgeEnabled = iconBadgeSwitch.checked;
      saveSettings();
    });
  }

  const filtersEventList = ['adult', 'gaming', 'shopping', 'gambling', 'streaming'];
  filtersEventList.forEach(f => {
    const switchEl = document.getElementById(`filter-${f}`);
    if (switchEl) {
      switchEl.addEventListener('change', () => {
        if (!isPremiumActive && switchEl.checked) {
          const activeFiltersCount = filtersEventList.filter(x => {
            const k = `filter${x.charAt(0).toUpperCase() + x.slice(1)}`;
            return settings[k] === true;
          }).length;
          if (activeFiltersCount >= 1) {
            switchEl.checked = false;
            showPaywall('filter', "You've Hit Your Smart Filter Limit", "The free plan allows <strong style='color: var(--accent); font-weight: 800;'>1 active smart filter</strong> at a time. Upgrade to Pro to activate all filters simultaneously.");
            return;
          }
        }
        const key = `filter${f.charAt(0).toUpperCase() + f.slice(1)}`;
        settings[key] = switchEl.checked;
        saveSettings();
      });
    }
  });

  // Home Sub-Tabs Switcher Logic
  const tabSocial = document.getElementById('tab-social-platforms');
  const tabFilters = document.getElementById('tab-smart-filters');
  const subviewSocial = document.getElementById('subview-social-platforms');
  const subviewFilters = document.getElementById('subview-smart-filters');

  if (tabSocial && tabFilters && subviewSocial && subviewFilters) {
    tabSocial.addEventListener('click', () => {
      tabSocial.classList.add('active');
      tabFilters.classList.remove('active');
      subviewSocial.style.display = 'flex';
      subviewFilters.style.display = 'none';
    });

    tabFilters.addEventListener('click', () => {
      tabFilters.classList.add('active');
      tabSocial.classList.remove('active');
      subviewFilters.style.display = 'flex';
      subviewSocial.style.display = 'none';
    });
  }

  // Render detail view headers, options checkboxes
  function renderPlatformDetailView(platform) {
    const nameSpan = document.getElementById('detail-platform-name');
    const iconDiv = document.getElementById('detail-platform-icon');
    const toggleInput = document.getElementById('detail-platform-toggle');
    const listContainer = document.getElementById('detail-checkboxes-list');

    const platformData = settings[platform];
    if (!platformData) return;

    // Set Header Icon and Name dynamically from row properties
    const mainRow = document.getElementById(`row-${platform}`);
    const svgIconHtml = mainRow.querySelector('.platform-icon').innerHTML;
    nameSpan.textContent = mainRow.querySelector('.platform-name').textContent;
    iconDiv.innerHTML = svgIconHtml;

    // Set options container title dynamically
    const optionsTitle = document.getElementById('detail-options-title');
    if (optionsTitle) {
      optionsTitle.textContent = `What to Block on ${nameSpan.textContent}`;
    }

    // Set master switch in detail view
    toggleInput.checked = platformData.enabled !== false;
    
    // Replace toggle listener to clear old event listeners safely
    const newToggleInput = toggleInput.cloneNode(true);
    toggleInput.parentNode.replaceChild(newToggleInput, toggleInput);
    newToggleInput.addEventListener('change', () => {
      if (!isPremiumActive && newToggleInput.checked) {
        const activePlatformsCount = ['youtube', 'facebook', 'twitter', 'reddit', 'instagram', 'tiktok'].filter(p => {
          return settings[p] && settings[p].enabled === true;
        }).length;
        if (activePlatformsCount >= 1) {
          newToggleInput.checked = false;
          showPaywall('platform', "You've Hit Your Social Platform Limit", "The free plan allows managing <strong style='color: var(--accent); font-weight: 800;'>1 social platform</strong> at a time. Upgrade to Pro to manage Social Platforms simultaneously.");
          return;
        }
      }
      platformData.enabled = newToggleInput.checked;
      
      const mainSwitch = document.getElementById(`toggle-${platform}`);
      if (mainSwitch) {
        mainSwitch.checked = platformData.enabled;
      }

      saveSettings();

      if (!platformData.enabled) {
        finalizeSession([getDomainFromPlatform(platform)]);
        reloadTabIfOnDomain(getDomainFromPlatform(platform));
      }
    });

    listContainer.innerHTML = '';
    const options = platformOptionsDef[platform] || [];
    options.forEach(opt => {
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = platformData[opt.key] !== false;
      
      checkbox.addEventListener('change', () => {
        // Allowed on free plan for the active plan
        platformData[opt.key] = checkbox.checked;
        saveSettings();
      });
      
      const spanBox = document.createElement('span');
      spanBox.className = 'checkbox-box';
      
      const spanLabel = document.createElement('span');
      spanLabel.className = 'checkbox-label';
      spanLabel.textContent = opt.label;
      
      label.appendChild(checkbox);
      label.appendChild(spanBox);
      label.appendChild(spanLabel);
      
      listContainer.appendChild(label);
    });

    // Render dynamic Block Full Site button in footer
    const footerContainer = document.getElementById('detail-actions-footer');
    if (footerContainer) {
      footerContainer.innerHTML = '';
      
      const hardList   = settings.hardBlockedSites || [];
      const platformDomain = getDomainFromPlatform(platform);
      const hardEntry  = hardList.find(s => s.domain.toLowerCase() === platformDomain.toLowerCase());
      const isHardBlocked = hardEntry && Date.now() < hardEntry.expiresAt;

      if (isHardBlocked) {
        const remaining = hardEntry.expiresAt - Date.now();
        
        const badge = document.createElement('div');
        badge.className = 'hard-block-active-badge';
        badge.style.cssText = 'background:rgba(239, 68, 68, 0.1); border-color:rgba(239, 68, 68, 0.2); width:100%; margin:8px 0 0 0; justify-content:center; padding: 10px 12px; border-radius: 10px; display: flex; align-items: center;';
        badge.innerHTML = `
          <span class="detail-timer-span" data-expires-at="${hardEntry.expiresAt}" style="color:#f87171; font-weight:700; font-size: 11px;">Blocked for next ${formatHBRemaining(remaining)}</span>
        `;
        
        footerContainer.appendChild(badge);
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn-block-full-platform block-mode';
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
          <span>Block Full Site</span>
        `;

        const pickerContainer = document.createElement('div');
        pickerContainer.className = 'duration-picker-popup';
        pickerContainer.style.cssText = 'display:none; margin-top:8px; width:100%; text-align:left;';
        pickerContainer.innerHTML = `
          <p class="duration-picker-label">BLOCK FOR HOW LONG?</p>
          <div class="duration-custom-row" style="display: flex; align-items: center; gap: 6px; width: 100%;">
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px;">
              <input type="number" id="platform-dur-hours-input" min="0" max="168" value="" placeholder="0" style="width: 36px; background: transparent; border: none; color: var(--text); font-family: inherit; font-size: 13.5px; font-weight: 700; text-align: center; outline: none; padding: 0; margin: 0; box-sizing: border-box;">
              <span style="font-size: 11px; color: var(--text-3); font-weight: 600; user-select: none;">hrs</span>
              <span style="color: var(--text-3); font-weight: 700; margin: 0 4px; user-select: none;">:</span>
              <input type="number" id="platform-dur-mins-input" min="0" max="59" value="" placeholder="00" style="width: 36px; background: transparent; border: none; color: var(--text); font-family: inherit; font-size: 13.5px; font-weight: 700; text-align: center; outline: none; padding: 0; margin: 0; box-sizing: border-box;">
              <span style="font-size: 11px; color: var(--text-3); font-weight: 600; user-select: none;">mins</span>
            </div>
            <button class="custom-dur-set-btn" id="platform-custom-dur-btn" style="padding: 8px 16px; background: var(--accent); color: var(--accent-text); border: none; border-radius: var(--radius); font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: inherit; transition: background 0.18s ease;">Set</button>
          </div>
          <button id="platform-btn-block-forever" style="width: 100%; margin-top: 8px; padding: 9px 12px; background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius); font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.18s ease;">
            <span style="font-size: 16px; font-weight: 800; line-height: 1;">∞</span> Block Indefinitely
          </button>
        `;

        btn.addEventListener('click', () => {
          const isVisible = pickerContainer.style.display !== 'none';
          pickerContainer.style.display = isVisible ? 'none' : 'block';
        });

        function applyPlatformDuration(ms) {
          if (ms <= 0) return;
          if (!isPremiumActive) {
            const currentActiveCount = getActiveBlockedSitesCount();
            const alreadyHardBlocked = (settings.hardBlockedSites || []).some(s => s.domain.toLowerCase() === platformDomain.toLowerCase() && Date.now() < s.expiresAt);
            if (currentActiveCount >= 2 && !alreadyHardBlocked) {
              showPaywall('site', "You've Hit Your Website Block Limit", "You can block up to <strong style='color: var(--accent); font-weight: 800;'>2 websites</strong> on the free plan. Upgrade to Pro for unlimited site blocking and absolute control over your workspace.");
              return;
            }
          }
          setHardBlock(platformDomain, ms);
          platformData.blockFullSite = true;
          saveSettings();
          renderPlatformDetailView(platform);
        }

        const customSetBtn = pickerContainer.querySelector('#platform-custom-dur-btn');
        if (customSetBtn) {
          customSetBtn.addEventListener('click', () => {
            const hrsEl = pickerContainer.querySelector('#platform-dur-hours-input');
            const minsEl = pickerContainer.querySelector('#platform-dur-mins-input');
            const hrs = parseInt(hrsEl ? hrsEl.value : '0', 10) || 0;
            const mins = parseInt(minsEl ? minsEl.value : '0', 10) || 0;
            const totalMs = (hrs * 3600 + mins * 60) * 1000;
            if (totalMs > 0) {
              applyPlatformDuration(totalMs);
            } else {
              showToast('Please set a duration greater than 0.');
            }
          });
        }

        const foreverBtn = pickerContainer.querySelector('#platform-btn-block-forever');
        if (foreverBtn) {
          foreverBtn.addEventListener('click', () => {
            const farFutureMs = 9999999999999 - Date.now();
            applyPlatformDuration(farFutureMs);
          });
        }

        footerContainer.appendChild(btn);
        footerContainer.appendChild(pickerContainer);
      }
    }
  }

  // 5. CUSTOM SITES LOGIC

  function renderCustomSites() {
    elements.customSitesList.innerHTML = '';
    
    // Filter custom sites with active hard block
    const hardList = settings.hardBlockedSites || [];
    const now = Date.now();

    const customList = (settings.customSites || [])
      .filter(site => {
        if (site.enabled === false) return false;
        const hardEntry = hardList.find(s => s.domain.toLowerCase() === site.domain.toLowerCase());
        return hardEntry && now < hardEntry.expiresAt;
      })
      .map(site => ({ domain: site.domain, id: site.id, isHardBlock: true }));

    // Find active platform hard blocks
    const activePlatformHardBlocks = [];
    const platformsList = ['youtube', 'facebook', 'instagram', 'reddit', 'tiktok', 'twitter'];
    
    platformsList.forEach(p => {
      const domain = getDomainFromPlatform(p);
      const hardEntry = hardList.find(s => s.domain.toLowerCase() === domain.toLowerCase());
      if (hardEntry && now < hardEntry.expiresAt) {
        activePlatformHardBlocks.push({
          domain: domain,
          id: 'platform-' + p,
          isHardBlock: true
        });
      }
    });

    // Find active schedules
    const activeSchedules = (settings.schedules || []).filter(isScheduleActive);
    const scheduleBlockedDomains = activeSchedules.map(s => ({
      domain: s.domain,
      id: 'schedule-' + s.id,
      isSchedule: true
    }));

    // Merge lists (avoiding duplicates)
    const list = [...customList];
    activePlatformHardBlocks.forEach(pBlock => {
      const exists = list.some(x => x.domain.toLowerCase() === pBlock.domain.toLowerCase());
      if (!exists) {
        list.push(pBlock);
      } else {
        const item = list.find(x => x.domain.toLowerCase() === pBlock.domain.toLowerCase());
        item.isHardBlock = true;
      }
    });

    scheduleBlockedDomains.forEach(sBlock => {
      const item = list.find(x => x.domain.toLowerCase() === sBlock.domain.toLowerCase());
      if (!item) {
        list.push(sBlock);
      } else {
        item.isSchedule = true;
      }
    });

    // Reverse list to show newest items first
    list.reverse();

    if (list.length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'empty-stats-msg-wrapper';
      emptyCard.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 16px; text-align: center; gap: 8px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 100%; box-sizing: border-box;';

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'empty-illustration';
      iconWrapper.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;';

      const glow = document.createElement('div');
      glow.style.cssText = 'position: absolute; width: 40px; height: 40px; background: radial-gradient(circle, rgba(61, 220, 132, 0.15) 0%, rgba(61, 220, 132, 0) 70%); filter: blur(4px);';
      iconWrapper.appendChild(glow);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '32');
      svg.setAttribute('height', '32');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#3ddc84');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.style.cssText = 'z-index: 1; filter: drop-shadow(0 0 6px rgba(61, 220, 132, 0.4)); opacity: 0.85;';

      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      path1.setAttribute('cx', '12');
      path1.setAttribute('cy', '12');
      path1.setAttribute('r', '10');
      svg.appendChild(path1);

      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      path2.setAttribute('x1', '2');
      path2.setAttribute('y1', '12');
      path2.setAttribute('x2', '22');
      path2.setAttribute('y2', '12');
      svg.appendChild(path2);

      const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path3.setAttribute('d', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z');
      svg.appendChild(path3);
      
      iconWrapper.appendChild(svg);
      emptyCard.appendChild(iconWrapper);

      const textWrapper = document.createElement('div');
      textWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      const title = document.createElement('span');
      title.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: -0.01em;';
      title.textContent = 'No Websites are Blocked';

      const desc = document.createElement('span');
      desc.style.cssText = 'font-size: 11px; color: var(--text-3); line-height: 1.45; max-width: 240px; margin: 0 auto;';
      desc.textContent = "Block any website and you'll see it here!";

      textWrapper.appendChild(title);
      textWrapper.appendChild(desc);
      emptyCard.appendChild(textWrapper);

      elements.customSitesList.appendChild(emptyCard);
      return;
    }

    list.forEach(site => {
      const item = document.createElement('div');
      item.className = 'custom-site-item';
      
      const urlWrapper = document.createElement('div');
      urlWrapper.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      const urlSpan = document.createElement('span');
      urlSpan.className = 'custom-site-url';
      urlSpan.textContent = site.domain;
      urlWrapper.appendChild(urlSpan);

      item.appendChild(urlWrapper);

      if (site.isHardBlock) {
        const hardEntry = hardList.find(s => s.domain.toLowerCase() === site.domain.toLowerCase());
        if (hardEntry && Date.now() < hardEntry.expiresAt) {
          const timerSpan = document.createElement('span');
          timerSpan.className = 'blocked-site-timer';
          timerSpan.dataset.expiresAt = hardEntry.expiresAt;
          timerSpan.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums;';
          
          const remaining = hardEntry.expiresAt - Date.now();
          if (remaining > 100000000000) {
            timerSpan.textContent = 'Indefinitely';
          } else {
            timerSpan.textContent = formatHBRemaining(remaining) + ' left';
          }
          item.appendChild(timerSpan);
        }
      } else if (site.isSchedule) {
        const schedSpan = document.createElement('span');
        schedSpan.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--accent);';
        schedSpan.textContent = 'Scheduled';
        item.appendChild(schedSpan);
      }
      
      elements.customSitesList.appendChild(item);
    });
  }


  // ── HARD BLOCK HELPERS ───────────────────────────────────────────

  let hbPopupTimerInterval = null;

  function formatHBRemaining(ms) {
    if (ms > 100000000000) return 'Indefinitely';
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const pad = n => String(n).padStart(2, '0');
    if (h > 0) return `${h}h ${pad(m)}m`;
    if (m > 0) return `${m}m ${pad(s)}s`;
    return `${s}s`;
  }

  function setHardBlock(domain, durationMs) {
    if (!domain || durationMs <= 0) return;
    const list = settings.hardBlockedSites || [];
    const filtered = list.filter(s => s.domain.toLowerCase() !== domain.toLowerCase());
    filtered.push({
      id: Date.now().toString(),
      domain: domain,
      expiresAt: Date.now() + durationMs,
      durationMs: durationMs
    });
    settings.hardBlockedSites = filtered;

    // Increment stats metrics
    if (!settings.focusStats) {
      settings.focusStats = {
        streakDays: 0,
        lastActiveDate: '',
        totalSessionsCompleted: 0,
        timeSavedMinutes: 0,
        siteBlockCounts: {},
        dailyLogs: {}
      };
    }
    const stats = settings.focusStats;
    stats.totalSessionsCompleted = (stats.totalSessionsCompleted || 0) + 1;

    // Map indefinite block duration to a reasonable representation (e.g. 60 mins) for visual tracking stats, else actual block minutes
    const minsSaved = durationMs > 100000000000 ? 60 : Math.round(durationMs / 60000);
    stats.timeSavedMinutes = (stats.timeSavedMinutes || 0) + minsSaved;

    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
    if (!stats.siteBlockCounts) stats.siteBlockCounts = {};
    stats.siteBlockCounts[cleanDomain] = (stats.siteBlockCounts[cleanDomain] || 0) + 1;

    // Write to dailyLogs
    if (!stats.dailyLogs) stats.dailyLogs = {};
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!stats.dailyLogs[todayStr]) {
      stats.dailyLogs[todayStr] = {
        sessions: 0,
        minutes: 0,
        siteCounts: {}
      };
    }
    const log = stats.dailyLogs[todayStr];
    log.sessions = (log.sessions || 0) + 1;
    log.minutes = (log.minutes || 0) + minsSaved;
    if (!log.siteCounts) log.siteCounts = {};
    log.siteCounts[cleanDomain] = (log.siteCounts[cleanDomain] || 0) + 1;

    chrome.storage.local.set({ 
      hardBlockedSites: filtered,
      focusStats: stats
    }, () => {
      recordActiveFocusDay();
      updateCurrentSiteUI();
      renderCustomSites();
      reloadTabIfOnHardBlockedDomain(domain);
    });
  }

  function removeHardBlockEntry(domain, callback) {
    chrome.storage.local.get('hardBlockedSites', (result) => {
      const sites   = result.hardBlockedSites || [];
      const updated = sites.filter(s => s.domain.toLowerCase() !== domain.toLowerCase());
      chrome.storage.local.set({ hardBlockedSites: updated }, () => {
        settings.hardBlockedSites = updated;
        if (callback) callback();
      });
    });
  }

  function reloadTabIfOnHardBlockedDomain(domain) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length || !tabs[0].url) return;
      try {
        const urlObj = new URL(tabs[0].url);
        const tabHost   = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        const targetD   = domain.toLowerCase().replace(/^www\./, '');
        let matches = tabHost === targetD || tabHost.endsWith('.' + targetD);

        // Also match the hard-blocked.html page for this domain
        if (!matches && urlObj.protocol.startsWith('chrome-extension') && urlObj.pathname.includes('hard-blocked.html')) {
          const p = new URLSearchParams(urlObj.search);
          const sp = (p.get('site') || '').toLowerCase().replace(/^www\./, '');
          if (sp === targetD || sp.endsWith('.' + targetD)) matches = true;
        }

        if (!matches) return;

        if (urlObj.protocol.startsWith('chrome-extension') && urlObj.pathname.includes('hard-blocked.html')) {
          const p = new URLSearchParams(urlObj.search);
          const orig = p.get('originalUrl') || ('https://' + targetD);
          chrome.tabs.update(tabs[0].id, { url: orig });
        } else {
          chrome.tabs.reload(tabs[0].id);
        }
      } catch (e) {
        console.error('Error reloading tab for hard block domain:', e);
      }
    });
  }

  function startGlobalPopupTimer() {
    if (hbPopupTimerInterval) clearInterval(hbPopupTimerInterval);
    
    function tick() {
      // 1. Current site card countdown
      const currentSiteEl = document.getElementById('hb-remaining-popup');
      if (currentSiteEl) {
        const expiresAt = parseInt(currentSiteEl.dataset.expiresAt || '0', 10);
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          updateCurrentSiteUI();
        } else if (remaining > 100000000000) {
          currentSiteEl.textContent = 'Blocked Indefinitely';
        } else {
          currentSiteEl.textContent = 'Blocked for next ' + formatHBRemaining(remaining);
        }
      }

      // 2. Blocked sites list countdowns
      const blockedTimers = document.querySelectorAll('.blocked-site-timer');
      blockedTimers.forEach(el => {
        const expiresAt = parseInt(el.dataset.expiresAt || '0', 10);
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          // If expired, refresh settings to trigger hide
          chrome.storage.local.get(null, (result) => {
            settings = mergeWithDefaults(result);
            renderCustomSites();
            updateCurrentSiteUI();
          });
        } else if (remaining > 100000000000) {
          el.textContent = 'Indefinitely';
        } else {
          el.textContent = formatHBRemaining(remaining) + ' left';
        }
      });

      // 3. Platform detail view countdowns (if open)
      const detailTimers = document.querySelectorAll('.detail-timer-span');
      detailTimers.forEach(el => {
        const expiresAt = parseInt(el.dataset.expiresAt || '0', 10);
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          chrome.storage.local.get(null, (result) => {
            settings = mergeWithDefaults(result);
            renderPlatformDetailView(currentDetailPlatform);
          });
        } else if (remaining > 100000000000) {
          el.textContent = 'Blocked Indefinitely';
        } else {
          el.textContent = `Blocked for next ${formatHBRemaining(remaining)}`;
        }
      });

      // 4. Update schedule active status badges
      updateScheduleActiveBadges();
    }

    tick();
    hbPopupTimerInterval = setInterval(tick, 1000);
  }

  // 6. DETECT CURRENT SITE LOGIC
  function detectCurrentSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let isWebPage = false;
      currentSiteBlockType = '';
      currentSiteBlockCategory = '';

      if (tabs.length > 0 && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          if (url.protocol.startsWith('http')) {
            currentSiteHostname = url.hostname.replace('www.', '').toLowerCase();
            isWebPage = true;
          } else if (url.protocol.startsWith('chrome-extension') && url.pathname.includes('hard-blocked.html')) {
            const params = new URLSearchParams(url.search);
            const typeParam = params.get('type');
            const siteParam = params.get('site');
            const domainParam = params.get('domain');

            if (typeParam === 'filter' && domainParam) {
              currentSiteHostname = domainParam.replace('www.', '').toLowerCase();
              currentSiteBlockType = 'filter';
              currentSiteBlockCategory = siteParam || 'Category Filter';
            } else {
              if (siteParam) {
                currentSiteHostname = siteParam.replace('www.', '').toLowerCase();
              }
              currentSiteBlockType = typeParam || '';
            }
            isWebPage = true;
          }
        } catch (e) {
          console.error('Error detecting current site:', e);
        }
      }

      if (isWebPage) {
        updateCurrentSiteUI();
      } else {
        currentSiteHostname = '';
        updateCurrentSiteUI();
      }
    });
  }

  function getPlatformFromHostname(hostname) {
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('facebook.com') || hostname.includes('messenger.com')) return 'facebook';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('reddit.com')) return 'reddit';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return null;
  }

  // Update current site block status card
  function updateCurrentSiteUI() {
    const section       = document.getElementById('current-site-section');
    const favicon       = document.getElementById('current-site-favicon');
    const nameSpan      = document.getElementById('current-site-name');
    const actionWrapper = document.getElementById('current-site-action-wrapper');

    if (!section) return;
    section.style.display = 'flex';

    const labelEl = section.querySelector('.current-site-label');

    const infoDiv    = section.querySelector('.current-site-info');
    const displayDiv = section.querySelector('.current-site-display');

    if (!currentSiteHostname) {
      section.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 14px; width: 100%; box-sizing: border-box; min-height: 76px;';
      if (infoDiv) infoDiv.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; margin: 0; padding: 0;';
      if (displayDiv) displayDiv.style.cssText = 'width: 100%; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0;';
      if (labelEl) labelEl.style.display = 'none';
      if (favicon) favicon.style.display = 'none';
      if (nameSpan) {
        nameSpan.style.cssText = 'max-width: 100% !important; white-space: normal !important; overflow: visible !important; width: 100%; display: block; margin: 0; padding: 0;';
        nameSpan.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; text-align: center; margin: 0; padding: 0;">
            <span style="font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 5px; display: block; width: 100%; text-align: center;">NO ACTIVE WEBSITE DETECTED</span>
            <div id="btn-open-new-tab" title="Click to open a new tab" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 8px; cursor: pointer; border-radius: var(--radius); transition: background 0.18s ease;">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; filter: drop-shadow(0 0 6px rgba(61, 220, 132, 0.4));"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              <span style="font-size: 12.5px; font-weight: 700; color: #3ddc84; line-height: 1.2; text-align: center;">Open a website to start blocking</span>
            </div>
          </div>
        `;
        const openBtn = document.getElementById('btn-open-new-tab');
        if (openBtn) {
          openBtn.addEventListener('click', () => {
            chrome.tabs.create({});
          });
        }
      }
      if (actionWrapper) actionWrapper.innerHTML = '';
      return;
    }

    section.style.cssText = '';
    if (infoDiv) infoDiv.style.cssText = '';
    if (displayDiv) displayDiv.style.cssText = '';

    if (labelEl) labelEl.style.display = 'block';

    if (favicon) favicon.style.display = 'block';
    if (nameSpan) nameSpan.style.cssText = '';
    nameSpan.textContent  = currentSiteHostname;
    favicon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent('https://' + currentSiteHostname)}&size=32`;
    favicon.onerror = () => {
      const googleFallback = `https://www.google.com/s2/favicons?domain=${currentSiteHostname}&sz=32`;
      if (favicon.src !== googleFallback) {
        favicon.src = googleFallback;
      } else {
        favicon.src = 'icons/icon16.png';
      }
    };

    // ── Check Hard Block Status ──────────────────────────────────
    const hardList   = settings.hardBlockedSites || [];
    const hardEntry  = hardList.find(s => {
      const d = s.domain.toLowerCase().replace(/^www\./, '');
      const h = currentSiteHostname.replace(/^www\./, '');
      return h === d || h.endsWith('.' + d);
    });
    const isHardBlocked = hardEntry && Date.now() < hardEntry.expiresAt;

    // ── Check Soft Block / Managed Status ───────────────────────
    const defaultSites = ['youtube.com', 'facebook.com', 'messenger.com', 'twitter.com', 'x.com', 'reddit.com', 'instagram.com', 'tiktok.com'];
    const isDefault    = defaultSites.some(site => currentSiteHostname === site || currentSiteHostname.endsWith('.' + site));

    // Remove any old timer element from the name area first to avoid duplicates
    const oldTimer = document.getElementById('hb-remaining-popup');
    if (oldTimer) oldTimer.remove();

    let html = '';
    if (isHardBlocked) {
      // ─── HARD BLOCK IS ACTIVE ─────────────────────────────────
      const remaining = hardEntry.expiresAt - Date.now();
      const badgeText = remaining > 100000000000 ? 'Blocked Indefinitely' : ('Blocked for next ' + formatHBRemaining(remaining));
      html = `
        <span id="hb-remaining-popup" data-expires-at="${hardEntry.expiresAt}" style="font-size: 11px; font-weight: 700; color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 5px 10px; border-radius: 6px; font-variant-numeric: tabular-nums; white-space: nowrap; align-self: center; display: inline-flex; align-items: center; gap: 4px;">${badgeText}</span>
      `;
    } else if (currentSiteBlockType === 'filter') {
      // ─── CATEGORY FILTER BLOCK ACTIVE ──────────────────────────
      html = `
        <span style="font-size: 11.5px; font-weight: 700; color: #fb923c; background: rgba(251, 146, 60, 0.1); border: 1px solid rgba(251, 146, 60, 0.2); padding: 5px 10px; border-radius: 6px; white-space: nowrap; align-self: center; display: inline-flex; align-items: center; gap: 4px;">Blocked by ${currentSiteBlockCategory}</span>
      `;
    } else {
      // ─── PRIMARY ACTION (hard block for all sites including social platforms) ───
      html += `
        <button class="btn-block-site" id="btn-block-current">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
          Block This Site
        </button>
        <div class="duration-picker-popup" id="duration-picker-popup" style="display:none; margin-top:8px;">
          <p class="duration-picker-label">BLOCK FOR HOW LONG?</p>
          <div class="duration-custom-row" style="display: flex; align-items: center; gap: 6px; width: 100%;">
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px;">
              <input type="number" id="dur-hours-input" min="0" max="168" value="" placeholder="0" style="width: 36px; background: transparent; border: none; color: var(--text); font-family: inherit; font-size: 13.5px; font-weight: 700; text-align: center; outline: none; padding: 0; margin: 0; box-sizing: border-box;">
              <span style="font-size: 11px; color: var(--text-3); font-weight: 600; user-select: none;">hrs</span>
              <span style="color: var(--text-3); font-weight: 700; margin: 0 4px; user-select: none;">:</span>
              <input type="number" id="dur-mins-input" min="0" max="59" value="" placeholder="00" style="width: 36px; background: transparent; border: none; color: var(--text); font-family: inherit; font-size: 13.5px; font-weight: 700; text-align: center; outline: none; padding: 0; margin: 0; box-sizing: border-box;">
              <span style="font-size: 11px; color: var(--text-3); font-weight: 600; user-select: none;">mins</span>
            </div>
            <button class="custom-dur-set-btn" id="custom-dur-btn" style="padding: 8px 16px; background: var(--accent); color: var(--accent-text); border: none; border-radius: var(--radius); font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: inherit; transition: background 0.18s ease;">Set</button>
          </div>
          <button id="btn-block-forever" style="width: 100%; margin-top: 8px; padding: 9px 12px; background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius); font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.18s ease;">
            <span style="font-size: 16px; font-weight: 800; line-height: 1;">∞</span> Block Indefinitely
          </button>
        </div>
      `;
    }

    actionWrapper.innerHTML = html;

    // ── Attach Event Listeners ───────────────────────────────────

    if (isHardBlocked) {
      // Handled by global popup timer
    } else {
      const blockBtn = document.getElementById('btn-block-current');
      if (blockBtn) {
        blockBtn.addEventListener('click', () => {
          const picker = document.getElementById('duration-picker-popup');
          if (picker) {
            const isVisible = picker.style.display !== 'none';
            picker.style.display = isVisible ? 'none' : 'block';
          }
        });
      }

      function applyDurationBlock(durationMs) {
        if (!durationMs || durationMs <= 0) return;
        if (!isPremiumActive) {
          const currentActiveCount = getActiveBlockedSitesCount();
          const alreadyExists = settings.customSites.some(s => s.domain.toLowerCase() === currentSiteHostname && s.enabled !== false);
          if (currentActiveCount >= 2 && !alreadyExists) {
            showPaywall('site', "You've Hit Your Website Block Limit", "You can block up to <strong style='color: var(--accent); font-weight: 800;'>2 websites</strong> on the free plan. Upgrade to Pro for unlimited site blocking and absolute control over your workspace.");
            return;
          }
        }
        setHardBlock(currentSiteHostname, durationMs);
        const alreadyExists = settings.customSites.some(s => s.domain.toLowerCase() === currentSiteHostname);
        if (!alreadyExists) {
          settings.customSites.push({ id: Date.now().toString(), domain: currentSiteHostname, enabled: true });
        } else {
          const siteRef = settings.customSites.find(s => s.domain.toLowerCase() === currentSiteHostname);
          if (siteRef) siteRef.enabled = true;
        }
        saveSettings();
        renderCustomSites();
      }

      // Custom duration Set button
      const customSetBtn = document.getElementById('custom-dur-btn');
      if (customSetBtn) {
        customSetBtn.addEventListener('click', () => {
          const hrsEl = document.getElementById('dur-hours-input');
          const minsEl = document.getElementById('dur-mins-input');
          const hrs = parseInt(hrsEl ? hrsEl.value : '0', 10) || 0;
          const mins = parseInt(minsEl ? minsEl.value : '0', 10) || 0;
          const totalMs = (hrs * 3600 + mins * 60) * 1000;
          if (totalMs > 0) {
            applyDurationBlock(totalMs);
          } else {
            showToast('Please set a duration greater than 0.');
          }
        });
      }

      // Permanent Block (∞) button
      const foreverBtn = document.getElementById('btn-block-forever');
      if (foreverBtn) {
        foreverBtn.addEventListener('click', () => {
          const farFutureMs = 9999999999999 - Date.now();
          applyDurationBlock(farFutureMs);
        });
      }
    }
  }

  // ── 7. TAB NAVIGATION LOGIC ──
  const tabBtnHome = document.getElementById('tab-btn-home');
  const tabBtnSchedule = document.getElementById('tab-btn-schedule');
  const panelHome = document.getElementById('panel-home');
  const panelSchedule = document.getElementById('panel-schedule');

  let activeInsightsFilter = 'daily'; // Default active insights filter

  function renderInsights() {
    if (!settings.focusStats) {
      settings.focusStats = {
        streakDays: 0,
        lastActiveDate: '',
        totalSessionsCompleted: 0,
        timeSavedMinutes: 0,
        siteBlockCounts: {},
        dailyLogs: {}
      };
    }
    const stats = settings.focusStats;
    const logs = stats.dailyLogs || {};

    let sessions = 0;
    let minutes = 0;
    let siteCounts = {};

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 1. Filter Aggregation Logic
    if (activeInsightsFilter === 'daily') {
      const todayData = logs[todayStr] || {};
      sessions = todayData.sessions || 0;
      minutes = todayData.minutes || 0;
      siteCounts = todayData.siteCounts || {};
    } else if (activeInsightsFilter === 'weekly' || activeInsightsFilter === 'monthly') {
      const daysToSum = activeInsightsFilter === 'weekly' ? 7 : 30;
      for (let i = 0; i < daysToSum; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayData = logs[dStr];
        if (dayData) {
          sessions += dayData.sessions || 0;
          minutes += dayData.minutes || 0;
          const daySites = dayData.siteCounts || {};
          Object.keys(daySites).forEach(domain => {
            siteCounts[domain] = (siteCounts[domain] || 0) + daySites[domain];
          });
        }
      }
    } else {
      // All Time: Fallback to root legacy stats if dailyLogs is completely empty, else aggregate everything
      const logDates = Object.keys(logs);
      if (logDates.length === 0) {
        sessions = stats.totalSessionsCompleted || 0;
        minutes = stats.timeSavedMinutes || 0;
        siteCounts = stats.siteBlockCounts || {};
      } else {
        logDates.forEach(dStr => {
          const dayData = logs[dStr] || {};
          sessions += dayData.sessions || 0;
          minutes += dayData.minutes || 0;
          const daySites = dayData.siteCounts || {};
          Object.keys(daySites).forEach(domain => {
            siteCounts[domain] = (siteCounts[domain] || 0) + daySites[domain];
          });
        });
      }
    }

    // 2. Day Streak
    const streakValEl = document.getElementById('insights-streak-val');
    if (streakValEl) {
      streakValEl.textContent = stats.streakDays !== undefined ? stats.streakDays : 0;
    }

    // 3. Time Saved
    const timeSavedValEl = document.getElementById('insights-time-saved-val');
    if (timeSavedValEl) {
      if (minutes < 60) {
        timeSavedValEl.textContent = `${minutes}m`;
      } else {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        timeSavedValEl.textContent = `${hrs}h ${mins}m`;
      }
    }

    // 4. Focus Sessions Completed
    const sessionsValEl = document.getElementById('insights-sessions-val');
    if (sessionsValEl) {
      sessionsValEl.textContent = sessions;
    }

    // 5. Top Blocked Distractions Progress
    const topContainer = document.getElementById('top-distractions-container');
    if (topContainer) {
      topContainer.innerHTML = '';
      const sortedKeys = Object.keys(siteCounts).sort((a, b) => siteCounts[b] - siteCounts[a]);

      if (sortedKeys.length === 0) {
        topContainer.innerHTML = `
          <div class="empty-stats-msg-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; gap: 8px; width: 100%; box-sizing: border-box; overflow: hidden;">
            <div class="empty-illustration" style="position: relative; display: flex; align-items: center; justify-content: center;">
              <!-- Glowing background halo -->
              <div style="position: absolute; width: 48px; height: 48px; background: radial-gradient(circle, rgba(61, 220, 132, 0.15) 0%, rgba(61, 220, 132, 0) 70%); filter: blur(4px);"></div>
              <!-- Premium custom line graph icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="z-index: 1; filter: drop-shadow(0 0 8px rgba(61, 220, 132, 0.4)); opacity: 0.85;">
                <path d="M3 3v18h18"/>
                <path d="m18.7 8-5.1 5.2-2.8-2.7L7 14.3"/>
              </svg>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
              <span style="font-size: 13.5px; font-weight: 700; color: var(--text); letter-spacing: -0.01em;">No Focus Data For This Range</span>
              <span style="font-size: 11px; color: var(--text-3); line-height: 1.45; max-width: 220px; margin: 0 auto;">Start blocking website to see your progress metrics show up here!</span>
            </div>
          </div>
        `;
      } else {
        const maxVal = siteCounts[sortedKeys[0]] || 1;

        sortedKeys.forEach(domain => {
          const count = siteCounts[domain];
          const pct = Math.max(12, Math.round((count / maxVal) * 100));

          const row = document.createElement('div');
          row.className = 'distraction-row';
          row.innerHTML = `
            <div class="distraction-info">
              <span class="distraction-name">${domain}</span>
              <span class="distraction-count">${count} block${count > 1 ? 's' : ''}</span>
            </div>
            <div class="distraction-bar-bg">
              <div class="distraction-bar-fill" style="width: ${pct}%"></div>
            </div>
          `;
          topContainer.appendChild(row);
        });
      }
    }

    // 6. Distractions Filter Header Label
    const filterLabelEl = document.getElementById('distractions-filter-label');
    const labels = {
      daily: '(Daily)',
      weekly: '(Last 7 Days)',
      monthly: '(Last 30 Days)',
      alltime: '(All Time)'
    };
    if (filterLabelEl) {
      filterLabelEl.textContent = labels[activeInsightsFilter] || '(All Time)';
    }

    // 7. Monthly Activity Trend Card (SVG Line Chart)
    const svgWrapper = document.getElementById('trend-svg-wrapper');
    if (svgWrapper) {
      const svgContainer = document.getElementById('trend-svg-container');
      if (svgContainer) {
        svgContainer.innerHTML = '';
      }
      let maxDaySessions = 0;
      const past30 = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayData = logs[dStr] || {};
        const dSessions = dayData.sessions || 0;
        
        // Sum total blocked attempts on this day
        const daySites = dayData.siteCounts || {};
        const dBlocked = Object.values(daySites).reduce((sum, count) => sum + count, 0);

        if (dSessions > maxDaySessions) {
          maxDaySessions = dSessions;
        }
        past30.push({
          dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          sessions: dSessions,
          blocked: dBlocked
        });
      }

      // Initialize subtitle to show today's statistics
      const todayData = logs[todayStr] || {};
      const todayBlocked = Object.values(todayData.siteCounts || {}).reduce((sum, count) => sum + count, 0);
      const todayLabel = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const todayText = `${todayBlocked} distraction${todayBlocked !== 1 ? 's' : ''} blocked on ${todayLabel}`;
      svgWrapper.todayText = todayText;

      const subtitleEl = document.getElementById('insights-trend-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent = todayText;
        subtitleEl.style.color = 'var(--text-3)';
      }

      const scaleMax = maxDaySessions || 1;
      
      // Calculate coordinates for the line chart
      const pointsArray = [];
      past30.forEach((item, idx) => {
        let pct = 0;
        if (item.sessions > 0) {
          pct = 15 + Math.round((item.sessions / scaleMax) * 85);
        }
        const x = Math.round((idx / 29) * 300);
        // Map Y coordinate (75px container height, leave 5px top padding and 10px bottom padding)
        const y = Math.round(65 - (pct / 100) * 55);
        pointsArray.push({
          x,
          y,
          dateLabel: item.dateLabel,
          sessions: item.sessions,
          blocked: item.blocked
        });
      });

      const pointsStr = pointsArray.map(p => `${p.x},${p.y}`).join(' ');
      const areaPointsStr = `0,75 ${pointsStr} 300,75`;

      const svgContent = `
        <svg width="100%" height="100%" viewBox="0 0 300 75" preserveAspectRatio="none" style="overflow: visible;">
          <defs>
            <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#3ddc84" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#3ddc84" stop-opacity="0.00" />
            </linearGradient>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#3ddc84" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
          </defs>
          <!-- Horizontal Grid Lines -->
          <line x1="0" y1="10" x2="300" y2="10" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.8" />
          <line x1="0" y1="37" x2="300" y2="37" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.8" />
          <line x1="0" y1="65" x2="300" y2="65" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.8" />
          
          <!-- Vertical hover guide line -->
          <line id="trend-hover-line" x1="0" y1="0" x2="0" y2="75" stroke="rgba(255, 255, 255, 0.15)" stroke-width="0.8" stroke-dasharray="2,2" style="opacity: 0; pointer-events: none; transition: opacity 0.12s ease;" />

          <polygon points="${areaPointsStr}" fill="url(#area-gradient)" />
          <polyline points="${pointsStr}" fill="none" stroke="url(#line-gradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 3px rgba(61, 220, 132, 0.4));" />
          <circle id="trend-hover-dot" r="4" fill="#3ddc84" stroke="#ffffff" stroke-width="1.5" style="opacity: 0; pointer-events: none; transition: opacity 0.1s ease; filter: drop-shadow(0 0 4px rgba(61, 220, 132, 0.9));" />
        </svg>
      `;

      // Build interactive overlay slices based on midpoints to ensure full coverage
      let rectsContent = "";
      pointsArray.forEach((p, idx) => {
        let xStart, xEnd;
        if (idx === 0) {
          xStart = 0;
          xEnd = (pointsArray[0].x + pointsArray[1].x) / 2;
        } else if (idx === 29) {
          xStart = (pointsArray[28].x + pointsArray[29].x) / 2;
          xEnd = 300;
        } else {
          xStart = (pointsArray[idx - 1].x + pointsArray[idx].x) / 2;
          xEnd = (pointsArray[idx].x + pointsArray[idx + 1].x) / 2;
        }
        const w = xEnd - xStart;
        rectsContent += `
          <rect 
            x="${xStart}" 
            y="0" 
            width="${w}" 
            height="75" 
            fill="transparent" 
            style="cursor: pointer;"
            class="trend-slice"
            data-index="${idx}"
          />
        `;
      });

      if (svgContainer) {
        svgContainer.innerHTML = svgContent + `<svg viewBox="0 0 300 75" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: auto; overflow: visible;">${rectsContent}</svg>`;
      }

      // Attach interaction listeners to slices
      const slices = svgWrapper.querySelectorAll('.trend-slice');
      const hoverDot = svgWrapper.querySelector('#trend-hover-dot');
      const hoverLine = svgWrapper.querySelector('#trend-hover-line');
      const htmlTooltip = document.getElementById('trend-html-tooltip');

      slices.forEach(slice => {
        const idx = parseInt(slice.getAttribute('data-index'));
        const p = pointsArray[idx];

        slice.addEventListener('mouseenter', () => {
          if (hoverDot) {
            hoverDot.setAttribute('cx', p.x);
            hoverDot.setAttribute('cy', p.y);
            hoverDot.style.opacity = '1';
          }
          if (hoverLine) {
            hoverLine.setAttribute('x1', p.x);
            hoverLine.setAttribute('x2', p.x);
            hoverLine.style.opacity = '1';
          }
          if (htmlTooltip) {
            const xPct = (p.x / 300) * 100;
            const yPct = (p.y / 75) * 100;
            htmlTooltip.style.left = `${xPct}%`;
            htmlTooltip.style.top = `${yPct}%`;
            
            // Shift alignment on edges to prevent overflow
            if (idx < 5) {
              htmlTooltip.style.transform = 'translate(5%, -110%)';
            } else if (idx > 25) {
              htmlTooltip.style.transform = 'translate(-105%, -110%)';
            } else {
              htmlTooltip.style.transform = 'translate(-50%, -110%)';
            }
            
            const dateEl = document.getElementById('tooltip-date');
            const valueEl = document.getElementById('tooltip-value');
            if (dateEl) dateEl.textContent = p.dateLabel;
            if (valueEl) valueEl.textContent = `${p.blocked} Blocked`;
            htmlTooltip.style.opacity = '1';
          }
          if (subtitleEl) {
            subtitleEl.textContent = `${p.blocked} distraction${p.blocked !== 1 ? 's' : ''} blocked on ${p.dateLabel}`;
            subtitleEl.style.color = 'var(--text)';
          }
        });

        slice.addEventListener('mouseleave', () => {
          const selectedIdx = svgWrapper.selectedDayIndex;
          const hasSelection = selectedIdx !== undefined && selectedIdx !== null;

          if (hoverDot) {
            if (hasSelection) {
              const selP = pointsArray[selectedIdx];
              hoverDot.setAttribute('cx', selP.x);
              hoverDot.setAttribute('cy', selP.y);
              hoverDot.style.opacity = '1';
            } else {
              hoverDot.style.opacity = '0';
            }
          }

          if (hoverLine) {
            if (hasSelection) {
              const selP = pointsArray[selectedIdx];
              hoverLine.setAttribute('x1', selP.x);
              hoverLine.setAttribute('x2', selP.x);
              hoverLine.style.opacity = '1';
            } else {
              hoverLine.style.opacity = '0';
            }
          }

          if (htmlTooltip) {
            if (hasSelection) {
              const selP = pointsArray[selectedIdx];
              const xPct = (selP.x / 300) * 100;
              const yPct = (selP.y / 75) * 100;
              htmlTooltip.style.left = `${xPct}%`;
              htmlTooltip.style.top = `${yPct}%`;
              if (selectedIdx < 5) {
                htmlTooltip.style.transform = 'translate(5%, -110%)';
              } else if (selectedIdx > 25) {
                htmlTooltip.style.transform = 'translate(-105%, -110%)';
              } else {
                htmlTooltip.style.transform = 'translate(-50%, -110%)';
              }
              const dateEl = document.getElementById('tooltip-date');
              const valueEl = document.getElementById('tooltip-value');
              if (dateEl) dateEl.textContent = selP.dateLabel;
              if (valueEl) valueEl.textContent = `${selP.blocked} Blocked`;
              htmlTooltip.style.opacity = '1';
            } else {
              htmlTooltip.style.opacity = '0';
            }
          }

          if (subtitleEl) {
            if (svgWrapper.selectedDayText) {
              subtitleEl.textContent = svgWrapper.selectedDayText;
              subtitleEl.style.color = 'var(--text)';
            } else {
              subtitleEl.textContent = todayText;
              subtitleEl.style.color = 'var(--text-3)';
            }
          }
        });

        slice.addEventListener('click', (e) => {
          e.stopPropagation();
          svgWrapper.selectedDayIndex = idx;
          if (hoverDot) {
            hoverDot.setAttribute('cx', p.x);
            hoverDot.setAttribute('cy', p.y);
            hoverDot.style.opacity = '1';
          }
          if (hoverLine) {
            hoverLine.setAttribute('x1', p.x);
            hoverLine.setAttribute('x2', p.x);
            hoverLine.style.opacity = '1';
          }
          const detailText = `${p.blocked} distraction${p.blocked !== 1 ? 's' : ''} blocked on ${p.dateLabel}`;
          svgWrapper.selectedDayText = detailText;
          if (subtitleEl) {
            subtitleEl.textContent = detailText;
            subtitleEl.style.color = 'var(--text)';
          }
          if (htmlTooltip) {
            const xPct = (p.x / 300) * 100;
            const yPct = (p.y / 75) * 100;
            htmlTooltip.style.left = `${xPct}%`;
            htmlTooltip.style.top = `${yPct}%`;
            if (idx < 5) {
              htmlTooltip.style.transform = 'translate(5%, -110%)';
            } else if (idx > 25) {
              htmlTooltip.style.transform = 'translate(-105%, -110%)';
            } else {
              htmlTooltip.style.transform = 'translate(-50%, -110%)';
            }
            const dateEl = document.getElementById('tooltip-date');
            const valueEl = document.getElementById('tooltip-value');
            if (dateEl) dateEl.textContent = p.dateLabel;
            if (valueEl) valueEl.textContent = `${p.blocked} Blocked`;
            htmlTooltip.style.opacity = '1';
          }
        });
      });
    }
  }

  // ── Setup Filter Chips Click Listeners ──
  const filterChips = document.querySelectorAll('.insights-filter-bar .filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filterType = chip.dataset.filter;
      if (filterType !== 'daily' && !isPremiumActive) {
        showPaywall('analytics', "Unlock Long-Term Focus Insights", "You can view <strong style='color: var(--accent); font-weight: 800;'>today's insights</strong> for free. Upgrade to Pro to access weekly, monthly, and lifetime charts to track your habit progress and time saved.");
        return;
      }
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeInsightsFilter = filterType;
      renderInsights();
    });
  });

  // ── Drag to Scroll with Mouse Right Click ──
  const topDistractionsContainer = document.getElementById('top-distractions-container');
  if (topDistractionsContainer) {
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    topDistractionsContainer.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right Click
        isDragging = true;
        startY = e.pageY - topDistractionsContainer.offsetTop;
        startScrollTop = topDistractionsContainer.scrollTop;
      }
    });

    topDistractionsContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const y = e.pageY - topDistractionsContainer.offsetTop;
      const walk = (y - startY) * 1.5; // Drag speed multiplier
      topDistractionsContainer.scrollTop = startScrollTop - walk;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
      }
    });

    // Disable standard context menu inside the distractions container to allow drag behavior
    topDistractionsContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  // ── Drag to Scroll with Mouse Right Click on Custom Sites ──
  const customSitesListEl = document.getElementById('custom-sites-list');
  if (customSitesListEl) {
    let isDraggingCS = false;
    let startYCS = 0;
    let startScrollTopCS = 0;

    customSitesListEl.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right Click
        isDraggingCS = true;
        startYCS = e.pageY - customSitesListEl.offsetTop;
        startScrollTopCS = customSitesListEl.scrollTop;
      }
    });

    customSitesListEl.addEventListener('mousemove', (e) => {
      if (!isDraggingCS) return;
      e.preventDefault();
      const y = e.pageY - customSitesListEl.offsetTop;
      const walk = (y - startYCS) * 1.5; // Drag speed multiplier
      customSitesListEl.scrollTop = startScrollTopCS - walk;
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingCS) {
        isDraggingCS = false;
      }
    });

    // Disable standard context menu inside the container to allow drag behavior
    customSitesListEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  // Revert Monthly Activity Trend card selection when clicking outside the card
  window.addEventListener('click', (e) => {
    const trendCard = document.querySelector('.trend-card');
    if (trendCard && !trendCard.contains(e.target)) {
      const svgWrapper = document.getElementById('trend-svg-wrapper');
      const subtitleEl = document.getElementById('insights-trend-subtitle');
      if (svgWrapper) {
        svgWrapper.selectedDayIndex = null;
        svgWrapper.selectedDayText = null;
        
        const hoverDot = svgWrapper.querySelector('#trend-hover-dot');
        if (hoverDot) hoverDot.style.opacity = '0';
        
        const hoverLine = svgWrapper.querySelector('#trend-hover-line');
        if (hoverLine) hoverLine.style.opacity = '0';
        
        const htmlTooltip = document.getElementById('trend-html-tooltip');
        if (htmlTooltip) htmlTooltip.style.opacity = '0';

        if (subtitleEl && svgWrapper.todayText) {
          subtitleEl.textContent = svgWrapper.todayText;
          subtitleEl.style.color = 'var(--text-3)';
        }
      }
    }
  });

  if (tabBtnHome && tabBtnSchedule && panelHome && panelSchedule) {
    tabBtnHome.addEventListener('click', () => {
      tabBtnHome.classList.add('active');
      tabBtnSchedule.classList.remove('active');
      panelHome.classList.add('active');
      panelHome.style.display = 'flex';
      panelSchedule.classList.remove('active');
      panelSchedule.style.display = 'none';
      detectCurrentSite();
    });

    tabBtnSchedule.addEventListener('click', () => {
      tabBtnSchedule.classList.add('active');
      tabBtnHome.classList.remove('active');
      panelSchedule.classList.add('active');
      panelSchedule.style.display = 'flex';
      panelHome.classList.remove('active');
      panelHome.style.display = 'none';
      renderSchedules();
    });
  }

  // ── APP-THEMED TOAST NOTIFICATION HELPER ──
  function showToast(message, type = 'error') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    if (type === 'error') {
      toast.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      toast.style.color = '#f87171';
    } else {
      toast.style.borderColor = 'rgba(61, 220, 132, 0.4)';
      toast.style.color = '#3ddc84';
    }

    toast.style.display = 'flex';
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.style.display = 'none'; }, 250);
    }, 2500);
  }

  // Helper: Import current active website domain into schedule domain input
  function handleImportCurrentSite() {
    const domainInput = document.getElementById('sched-domain');
    if (!domainInput) return;

    if (currentSiteHostname) {
      domainInput.value = currentSiteHostname;
      domainInput.focus();
      showToast('Domain imported!', 'success');
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            if (url.protocol.startsWith('http')) {
              const h = url.hostname.replace(/^www\./, '').toLowerCase();
              domainInput.value = h;
              domainInput.focus();
              showToast('Domain imported!', 'success');
              return;
            }
          } catch (e) {
            console.error('Error importing current site:', e);
          }
        }
        showToast('No active website open to import');
      });
    }
  }

  const btnImportIcon = document.getElementById('btn-import-current-icon');
  if (btnImportIcon) btnImportIcon.addEventListener('click', handleImportCurrentSite);

  // ── 8. DAY PICKER SELECTOR LOGIC ──
  const dayPills = document.querySelectorAll('#sched-days-selector .day-pill');
  dayPills.forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
    });
  });

  // ── 9. SCHEDULE FORM EDIT MODE & SUBMISSION ──
  let editingScheduleId = null;

  function resetScheduleForm() {
    editingScheduleId = null;
    const domainInput = document.getElementById('sched-domain');
    if (domainInput) domainInput.value = '';
    
    const addBtn = document.getElementById('btn-add-schedule');
    const editActions = document.getElementById('sched-edit-actions');
    if (addBtn) addBtn.style.display = 'flex';
    if (editActions) editActions.style.display = 'none';
  }

  function processScheduleForm(isEditing = false) {
    if (!isPremiumActive) {
      const scheduleCount = (settings.schedules || []).length;
      if (scheduleCount >= 1 && !isEditing) {
        showPaywall('schedule', "You've Hit Your Custom Schedules Limit", "You can add up to <strong style='color: var(--accent); font-weight: 800;'>1 schedule</strong> on the free plan. Upgrade to Pro for unlimited focus schedules and complete automation.");
        return;
      }
    }
    const domainInput = document.getElementById('sched-domain');
    const startInput = document.getElementById('sched-start');
    const endInput = document.getElementById('sched-end');

    let domain = domainInput ? domainInput.value.trim().toLowerCase() : '';
    if (!domain) {
      showToast('Please enter a website domain.');
      return;
    }

    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    if (!domain || !domain.includes('.')) {
      showToast('Please enter a valid domain (e.g. instagram.com).');
      return;
    }

    const startTime = startInput ? startInput.value : '09:00';
    const endTime = endInput ? endInput.value : '17:00';

    const activeDays = [];
    const selectedDayPills = document.querySelectorAll('#sched-days-selector .day-pill.active');
    selectedDayPills.forEach(pill => {
      activeDays.push(parseInt(pill.dataset.day, 10));
    });

    if (activeDays.length === 0) {
      showToast('Please select at least one day.');
      return;
    }

    if (!settings.schedules) settings.schedules = [];

    if (isEditing && editingScheduleId) {
      const idx = settings.schedules.findIndex(s => s.id === editingScheduleId);
      if (idx !== -1) {
        settings.schedules[idx] = {
          id: editingScheduleId,
          domain: domain,
          startTime: startTime,
          endTime: endTime,
          days: activeDays,
          enabled: true
        };
      } else {
        settings.schedules.push({
          id: Date.now().toString(),
          domain: domain,
          startTime: startTime,
          endTime: endTime,
          days: activeDays,
          enabled: true
        });
      }
      showToast('Schedule updated!', 'success');
    } else {
      settings.schedules.push({
        id: Date.now().toString(),
        domain: domain,
        startTime: startTime,
        endTime: endTime,
        days: activeDays,
        enabled: true
      });
      showToast('Schedule added!', 'success');
    }

    saveSettings();
    renderSchedules();
    resetScheduleForm();
    reloadTabIfOnDomain(domain);
  }

  const btnAddSchedule = document.getElementById('btn-add-schedule');
  if (btnAddSchedule) {
    btnAddSchedule.addEventListener('click', () => processScheduleForm(false));
  }

  const btnSaveSchedule = document.getElementById('btn-save-schedule');
  if (btnSaveSchedule) {
    btnSaveSchedule.addEventListener('click', () => processScheduleForm(true));
  }

  const btnCancelSchedule = document.getElementById('btn-cancel-schedule');
  if (btnCancelSchedule) {
    btnCancelSchedule.addEventListener('click', resetScheduleForm);
  }

  // Helper: Format 24h time string (HH:MM) to 12h AM/PM string
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

  // Helper: Check if schedule is currently active (time & day)
  function isScheduleActive(sched) {
    if (!sched || !sched.enabled) return false;
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (0=Sunday)
    if (!sched.days || !sched.days.includes(currentDay)) return false;

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

  // Helper to format days array
  function formatDaysList(days) {
    if (!days || days.length === 0) return 'No days';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => names[d]).join(', ');
  }

  // Helper to update active green dot light dynamically on popup timer ticks
  function updateScheduleActiveBadges() {
    const schedList = settings.schedules || [];
    const items = document.querySelectorAll('.schedule-item');
    items.forEach(item => {
      const id = item.dataset.id;
      const sched = schedList.find(s => s.id === id);
      if (!sched) return;
      const domainWrapper = item.querySelector('.schedule-site-domain-wrapper');
      if (!domainWrapper) return;
      
      let badge = domainWrapper.querySelector('.schedule-active-badge');
      const isActiveNow = isScheduleActive(sched);
      
      if (isActiveNow) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'schedule-active-badge';
          badge.style.cssText = 'width: 7px; height: 7px; border-radius: 50%; background: #3ddc84; display: inline-block; box-shadow: 0 0 8px #3ddc84; flex-shrink: 0; margin-left: 2px;';
          badge.title = 'Active Now';
          domainWrapper.appendChild(badge);
        }
      } else {
        if (badge) badge.remove();
      }
    });
  }

  // ── 10. RENDER SCHEDULES ──
  function renderSchedules() {
    const listContainer = document.getElementById('schedules-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const schedList = settings.schedules || [];

    if (schedList.length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'empty-stats-msg-wrapper';
      emptyCard.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 16px; text-align: center; gap: 8px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 100%; box-sizing: border-box;';

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'empty-illustration';
      iconWrapper.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;';

      const glow = document.createElement('div');
      glow.style.cssText = 'position: absolute; width: 40px; height: 40px; background: radial-gradient(circle, rgba(61, 220, 132, 0.15) 0%, rgba(61, 220, 132, 0) 70%); filter: blur(4px);';
      iconWrapper.appendChild(glow);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '32');
      svg.setAttribute('height', '32');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#3ddc84');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.style.cssText = 'z-index: 1; filter: drop-shadow(0 0 6px rgba(61, 220, 132, 0.4)); opacity: 0.85;';

      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      path1.setAttribute('cx', '12');
      path1.setAttribute('cy', '12');
      path1.setAttribute('r', '10');
      svg.appendChild(path1);

      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      path2.setAttribute('points', '12 6 12 12 16 14');
      svg.appendChild(path2);
      
      iconWrapper.appendChild(svg);
      emptyCard.appendChild(iconWrapper);

      const textWrapper = document.createElement('div');
      textWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      const title = document.createElement('span');
      title.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: -0.01em;';
      title.textContent = 'No Active Schedules';

      const desc = document.createElement('span');
      desc.style.cssText = 'font-size: 11px; color: var(--text-3); line-height: 1.45; max-width: 240px; margin: 0 auto;';
      desc.textContent = "Add one above & you'll see it here!";

      textWrapper.appendChild(title);
      textWrapper.appendChild(desc);
      emptyCard.appendChild(textWrapper);

      listContainer.appendChild(emptyCard);
      return;
    }

    schedList.forEach(sched => {
      const item = document.createElement('div');
      item.className = 'schedule-item';
      item.dataset.id = sched.id;

      const infoGroup = document.createElement('div');
      infoGroup.className = 'schedule-info-group';

      const domainWrapper = document.createElement('div');
      domainWrapper.className = 'schedule-site-domain-wrapper';
      domainWrapper.style.cssText = 'display:flex; align-items:center; gap:6px; flex-wrap:wrap;';

      const domainSpan = document.createElement('span');
      domainSpan.className = 'schedule-site-domain';
      domainSpan.textContent = sched.domain;
      domainWrapper.appendChild(domainSpan);

      if (isScheduleActive(sched)) {
        const badge = document.createElement('span');
        badge.className = 'schedule-active-badge';
        badge.style.cssText = 'width: 7px; height: 7px; border-radius: 50%; background: #3ddc84; display: inline-block; box-shadow: 0 0 8px #3ddc84; flex-shrink: 0; margin-left: 2px;';
        badge.title = 'Active Now';
        domainWrapper.appendChild(badge);
      }

      const timeRange = document.createElement('span');
      timeRange.className = 'schedule-time-range';
      timeRange.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px; display:inline-block; vertical-align:middle;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${format12Hour(sched.startTime)} - ${format12Hour(sched.endTime)}
      `;

      const daysSpan = document.createElement('span');
      daysSpan.className = 'schedule-days-list';
      daysSpan.textContent = formatDaysList(sched.days);

      infoGroup.appendChild(domainWrapper);
      infoGroup.appendChild(timeRange);
      infoGroup.appendChild(daysSpan);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'schedule-actions';

      // Reschedule (Edit) Button
      const rescheduleBtn = document.createElement('button');
      rescheduleBtn.className = 'btn-reschedule';
      rescheduleBtn.ariaLabel = `Reschedule block for ${sched.domain}`;
      rescheduleBtn.title = 'Reschedule / Edit';
      rescheduleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      `;
      rescheduleBtn.addEventListener('click', () => {
        editingScheduleId = sched.id;

        // Load schedule parameters into form inputs
        const domainInput = document.getElementById('sched-domain');
        const startInput = document.getElementById('sched-start');
        const endInput = document.getElementById('sched-end');

        if (domainInput) domainInput.value = sched.domain;
        if (startInput) startInput.value = sched.startTime;
        if (endInput) endInput.value = sched.endTime;

        // Set day pills active state
        const dayPills = document.querySelectorAll('#sched-days-selector .day-pill');
        dayPills.forEach(pill => {
          const dayIdx = parseInt(pill.dataset.day, 10);
          if (sched.days.includes(dayIdx)) {
            pill.classList.add('active');
          } else {
            pill.classList.remove('active');
          }
        });

        // Show Save & Cancel action buttons, hide Add button
        const addBtn = document.getElementById('btn-add-schedule');
        const editActions = document.getElementById('sched-edit-actions');
        if (addBtn) addBtn.style.display = 'none';
        if (editActions) editActions.style.display = 'flex';

        if (domainInput) domainInput.focus();
      });

      // Delete Button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.ariaLabel = `Delete schedule for ${sched.domain}`;
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
      `;
      deleteBtn.addEventListener('click', () => {
        settings.schedules = settings.schedules.filter(s => s.id !== sched.id);
        saveSettings();
        renderSchedules();
        reloadTabIfOnDomain(sched.domain);
        showToast('Schedule deleted', 'success');
      });

      actionsDiv.appendChild(rescheduleBtn);
      actionsDiv.appendChild(deleteBtn);

      item.appendChild(infoGroup);
      item.appendChild(actionsDiv);

      listContainer.appendChild(item);
    });
  }

  // ── PREMIUM SUBSCRIPTION & AUTH HELPERS ──
  let isPremiumActive = false;

  async function checkPremiumStatus() {
    isPremiumActive = await authService.isPremium();
    return isPremiumActive;
  }

  async function updateTrialBanner() {
    const banner = document.getElementById('trial-alert-banner');
    if (banner) banner.style.display = 'none';
  }

  function showPaywall(limitType = 'site', title = 'Limit Reached!', message = 'Upgrade to Pro to unlock full capabilities!') {
    const overlay = document.getElementById('paywall-overlay');
    const iconContainer = document.getElementById('paywall-icon-container');
    const titleEl = document.getElementById('paywall-title');
    const msgEl = document.getElementById('paywall-message');
    
    if (overlay) {
      let iconSvg = '';
      let glowBg = 'rgba(61, 220, 132, 0.12)';
      let shadowColor = 'rgba(61, 220, 132, 0.35)';
      
      switch (limitType) {
        case 'site':
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(251,113,133,0.45));"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
          glowBg = 'rgba(251, 113, 133, 0.12)';
          shadowColor = 'rgba(251, 113, 133, 0.35)';
          break;
        case 'schedule':
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(250,204,21,0.45));"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
          glowBg = 'rgba(250, 204, 21, 0.12)';
          shadowColor = 'rgba(250, 204, 21, 0.35)';
          break;
        case 'filter':
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(45,212,191,0.45));"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
          glowBg = 'rgba(45, 212, 191, 0.12)';
          shadowColor = 'rgba(45, 212, 191, 0.35)';
          break;
        case 'platform':
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(249,115,22,0.45));"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
          glowBg = 'rgba(249, 115, 22, 0.12)';
          shadowColor = 'rgba(249, 115, 22, 0.35)';
          break;
        case 'subelement':
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(192,132,252,0.45));"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`;
          glowBg = 'rgba(192, 132, 252, 0.12)';
          shadowColor = 'rgba(192, 132, 252, 0.35)';
          break;
        case 'analytics':
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(56,189,248,0.45));"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
          glowBg = 'rgba(56, 189, 248, 0.12)';
          shadowColor = 'rgba(56, 189, 248, 0.35)';
          break;
        default:
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      
      if (iconContainer) {
        iconContainer.innerHTML = iconSvg;
        iconContainer.style.background = glowBg;
        iconContainer.style.boxShadow = `0 0 16px ${shadowColor}`;
      }
      
      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.innerHTML = message;
      overlay.style.display = 'flex';

      // Reset CSS animations for bullets list to replay slides nicely when opened!
      const bullets = document.querySelectorAll('.paywall-bullet-item');
      bullets.forEach(b => {
        b.style.animation = 'none';
        b.offsetHeight; /* trigger reflow */
        b.style.animation = '';
      });
    }
  }

  function showSyncModal(type, onClose) {
    const overlay = document.getElementById('sync-dialog-overlay');
    const iconContainer = document.getElementById('sync-modal-icon-container');
    const titleEl = document.getElementById('sync-modal-title');
    const msgEl = document.getElementById('sync-modal-message');
    const progressContainer = document.getElementById('sync-modal-progress-container');
    const progressBar = document.getElementById('sync-modal-progress-bar');
    const actionsEl = document.getElementById('sync-modal-actions');
    const glowEl = document.getElementById('sync-modal-glow');

    if (!overlay) return;

    overlay.style.display = 'flex';
    actionsEl.innerHTML = '';
    progressContainer.style.display = 'none';

    if (type === 'pro-logout') {
      glowEl.style.background = 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0) 70%)';
      iconContainer.style.background = 'rgba(234, 179, 8, 0.08)';
      iconContainer.style.border = '1px solid rgba(234, 179, 8, 0.2)';
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
      titleEl.textContent = 'Logged Out';
      msgEl.textContent = 'You are logged out. Log in again to access Pro features and restore your data.';

      const btnLogin = document.createElement('button');
      btnLogin.className = 'btn-upgrade-paddle';
      btnLogin.style.cssText = 'width: 100%; padding: 10px; background: linear-gradient(90deg, #eab308, #f59e0b); color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 11.5px;';
      btnLogin.textContent = 'Log In Again';
      btnLogin.onclick = () => {
        overlay.style.display = 'none';
        showSubview('settings');
        const overlayPaywall = document.getElementById('paywall-overlay');
        if (overlayPaywall) overlayPaywall.style.display = 'flex';
      };

      const btnDismiss = document.createElement('button');
      btnDismiss.style.cssText = 'background: none; border: none; color: var(--text-3); font-size: 11px; cursor: pointer; font-family: inherit; margin-top: 4px;';
      btnDismiss.textContent = 'Dismiss';
      btnDismiss.onclick = () => {
        overlay.style.display = 'none';
        if (onClose) onClose();
      };

      actionsEl.appendChild(btnLogin);
      actionsEl.appendChild(btnDismiss);

    } else if (type === 'free-logout') {
      glowEl.style.background = 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0) 70%)';
      iconContainer.style.background = 'rgba(244, 63, 94, 0.08)';
      iconContainer.style.border = '1px solid rgba(244, 63, 94, 0.2)';
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.04-1.21-1.88-2.22-2.38"/><path d="M9.5 19H7a5 5 0 0 1-.5-9.98c.19-2.8 2.22-5 4.88-5c1.86 0 3.5 1.07 4.14 2.65"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
      titleEl.textContent = 'Logged Out';
      msgEl.textContent = 'You are logged out. Log in again to restore your settings, or upgrade to Pro for advanced features!';

      const btnLogin = document.createElement('button');
      btnLogin.className = 'btn-upgrade-paddle';
      btnLogin.style.cssText = 'width: 100%; padding: 10px; background: linear-gradient(90deg, var(--accent), #56e29f); color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 11.5px;';
      btnLogin.textContent = 'Log In Again';
      btnLogin.onclick = () => {
        overlay.style.display = 'none';
        showSubview('settings');
        const overlayPaywall = document.getElementById('paywall-overlay');
        if (overlayPaywall) overlayPaywall.style.display = 'flex';
      };

      const btnDismiss = document.createElement('button');
      btnDismiss.style.cssText = 'background: none; border: none; color: var(--text-3); font-size: 11px; cursor: pointer; font-family: inherit; margin-top: 4px;';
      btnDismiss.textContent = 'Dismiss';
      btnDismiss.onclick = () => {
        overlay.style.display = 'none';
        if (onClose) onClose();
      };

      actionsEl.appendChild(btnLogin);
      actionsEl.appendChild(btnDismiss);

    } else if (type === 'pro-login') {
      glowEl.style.background = 'radial-gradient(circle, rgba(61, 220, 132, 0.15) 0%, rgba(61, 220, 132, 0) 70%)';
      iconContainer.style.background = 'rgba(61, 220, 132, 0.08)';
      iconContainer.style.border = '1px solid rgba(61, 220, 132, 0.2)';
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
      titleEl.textContent = 'Restoring Data...';
      msgEl.textContent = 'You are logged in! We are restoring your cloud settings and focus history...';
      
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';

      // Simulate progress bar filling up
      setTimeout(() => { progressBar.style.width = '35%'; }, 100);
      setTimeout(() => { progressBar.style.width = '70%'; }, 500);
      setTimeout(() => { 
        progressBar.style.width = '100%'; 
        setTimeout(() => {
          overlay.style.display = 'none';
          if (onClose) onClose();
        }, 300);
      }, 1200);
    }
  }

  async function updateAccountUI() {
    const user = await authService.getCurrentUser();
    const isPremium = await authService.isPremium();
    
    const loggedOutCard = document.getElementById('account-logged-out-card');
    const loggedInCard = document.getElementById('account-logged-in-card');
    const promoCard = document.getElementById('account-premium-promo-card');
    
    const settingsAccountStatus = document.getElementById('settings-account-status');
    const settingsAccountTitle = document.getElementById('settings-account-title');
    const settingsAccountVisual = document.getElementById('settings-account-visual-container');
    const premiumPromo = document.getElementById('settings-premium-promo');
    
    // Bind click listener for upgrade promo button once
    const btnSettingsUpgrade = document.getElementById('btn-settings-upgrade');
    if (btnSettingsUpgrade && !btnSettingsUpgrade.dataset.bound) {
      btnSettingsUpgrade.dataset.bound = 'true';
      btnSettingsUpgrade.addEventListener('click', () => {
        showPaywall('site', "Upgrade to FocusShield Pro", "Get unlimited website blocks, custom schedules, smart filter categories, and weekly/monthly charts.");
      });
    }

    if (premiumPromo) {
      premiumPromo.style.display = isPremium ? 'none' : 'flex';
    }

    if (user) {
      if (loggedOutCard) loggedOutCard.style.display = 'none';
      if (loggedInCard) loggedInCard.style.display = 'flex';
      
      const emailEl = document.getElementById('account-email');
      if (emailEl) emailEl.textContent = user.fullName || user.email;

      // Bind Edit Name button once
      const btnEditName = document.getElementById('btn-edit-name');
      if (btnEditName && !btnEditName.dataset.bound) {
        btnEditName.dataset.bound = 'true';
        btnEditName.addEventListener('click', () => {
          const nameContainer = document.getElementById('account-name-container');
          if (!nameContainer) return;
          
          const currentText = emailEl.textContent;
          const isEmail = currentText.includes('@');
          const defaultVal = isEmail ? '' : currentText;
          
          nameContainer.innerHTML = `
            <input type="text" id="input-edit-name" value="${defaultVal.replace(/"/g, '&quot;')}" placeholder="Enter your name" style="flex: 1; min-width: 0; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 4px 8px; color: #fff; font-size: 12px; font-family: inherit; height: 26px; box-sizing: border-box;">
            <button type="button" id="btn-save-name" style="background: rgba(61,220,132,0.15); border: 1px solid rgba(61,220,132,0.25); color: var(--accent); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; height: 26px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;">Save</button>
            <button type="button" id="btn-cancel-name" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text-3); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; height: 26px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;">Cancel</button>
          `;
          
          const inputName = document.getElementById('input-edit-name');
          const btnSave = document.getElementById('btn-save-name');
          const btnCancel = document.getElementById('btn-cancel-name');
          
          if (inputName) inputName.focus();
          
          const restoreContainer = () => {
            nameContainer.innerHTML = `
              <span id="account-email" style="font-size: 13.5px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${emailEl.textContent}</span>
              <button type="button" id="btn-edit-name" style="background: none; border: none; padding: 2px; color: var(--text-3); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: color 0.2s; flex-shrink: 0;" title="Edit Name">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>
            `;
            updateAccountUI();
          };
          
          if (btnCancel) {
            btnCancel.addEventListener('click', restoreContainer);
          }
          
          if (btnSave) {
            btnSave.addEventListener('click', async () => {
              const newName = inputName.value.trim();
              if (newName.length === 0) return;
              
              btnSave.textContent = 'Saving…';
              btnSave.disabled = true;
              
              try {
                await authService.updateName(newName);
                emailEl.textContent = newName;
                restoreContainer();
              } catch (err) {
                alert('Failed to update name: ' + err.message);
                btnSave.textContent = 'Save';
                btnSave.disabled = false;
              }
            });
          }
        });
      }
      
      const badge = document.getElementById('account-badge');
      if (badge) {
        badge.textContent = user.isPremium ? 'Premium Member' : 'Free Tier';
        badge.style.background = user.isPremium ? 'rgba(61,220,132,0.1)' : 'rgba(255,255,255,0.06)';
        badge.style.color = user.isPremium ? '#a3ffd6' : 'rgba(255,255,255,0.5)';
      }
      
      if (promoCard) promoCard.style.display = user.isPremium ? 'none' : 'flex';
      
      if (settingsAccountTitle) {
        if (user.fullName) {
          settingsAccountTitle.textContent = user.fullName;
        } else {
          const username = user.email.split('@')[0];
          settingsAccountTitle.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        }
      }
      if (settingsAccountStatus) {
        settingsAccountStatus.style.display = 'block';
        settingsAccountStatus.innerHTML = user.isPremium 
          ? `<span style="display: inline-block; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: var(--accent); background: rgba(61, 220, 132, 0.1); padding: 2.5px 7.5px; border-radius: 5px; border: 1px solid rgba(61, 220, 132, 0.2); letter-spacing: 0.05em; margin-top: 2.5px; text-shadow: 0 0 4px rgba(61,220,132,0.15);">Pro Plan</span>`
          : `<span style="display: inline-block; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #94a3b8; background: rgba(255, 255, 255, 0.05); padding: 2.5px 7.5px; border-radius: 5px; border: 1px solid rgba(255, 255, 255, 0.1); letter-spacing: 0.05em; margin-top: 2.5px;">Free Plan</span>`;
      }
      if (settingsAccountVisual) {
        const initial = user.email.charAt(0).toUpperCase();
        settingsAccountVisual.innerHTML = `
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, #10b981 100%); color: #000; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; text-transform: uppercase; box-shadow: 0 0 10px rgba(61, 220, 132, 0.25); border: 1px solid rgba(255,255,255,0.1); box-sizing: border-box;">${initial}</div>
        `;
      }
    } else {
      if (loggedOutCard) loggedOutCard.style.display = 'flex';
      if (loggedInCard) loggedInCard.style.display = 'none';
      if (promoCard) promoCard.style.display = isPremium ? 'none' : 'flex';
      
      if (settingsAccountTitle) {
        settingsAccountTitle.textContent = 'Login / Sign Up';
      }
      if (settingsAccountStatus) {
        settingsAccountStatus.style.display = 'block';
        settingsAccountStatus.innerHTML = `<span style="display: inline-block; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #94a3b8; background: rgba(255, 255, 255, 0.05); padding: 2.5px 7.5px; border-radius: 5px; border: 1px solid rgba(255, 255, 255, 0.1); letter-spacing: 0.05em; margin-top: 2.5px;">Free Plan</span>`;
      }
      if (settingsAccountVisual) {
        settingsAccountVisual.innerHTML = `
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(56, 189, 248, 0.05);">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.25));"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
        `;
      }
    }
  }

  // ── Account View Toggle Listeners ──
  const btnSettingsGoToAccount = document.getElementById('btn-settings-go-to-account');
  if (btnSettingsGoToAccount) {
    btnSettingsGoToAccount.addEventListener('click', async () => {
      const user = await authService.getCurrentUser();
      const targetUrl = user ? 'https://getfocusshield.site/account.html' : 'https://getfocusshield.site/signup.html?redirect=account';
      chrome.tabs.create({ url: targetUrl });
    });
  }

  const trialUpgradeBtn = document.getElementById('trial-upgrade-btn');
  if (trialUpgradeBtn) {
    trialUpgradeBtn.addEventListener('click', () => {
      // Direct user to settings first, then click go-to-account
      const btnShowSettings = document.getElementById('btn-show-settings');
      if (btnShowSettings) {
        btnShowSettings.click();
        const btnGoToAccount = document.getElementById('btn-settings-go-to-account');
        if (btnGoToAccount) btnGoToAccount.click();
      }
    });
  }

  // Close Paywall Button / Redirect to Login
  const btnPaywallClose = document.getElementById('btn-paywall-close');
  if (btnPaywallClose) {
    btnPaywallClose.addEventListener('click', () => {
      const overlay = document.getElementById('paywall-overlay');
      if (overlay) overlay.style.display = 'none';
      chrome.tabs.create({ url: 'https://getfocusshield.site/login' });
    });
  }

  // Back Button at top of Paywall
  const btnPaywallCloseTop = document.getElementById('btn-paywall-close-top');
  if (btnPaywallCloseTop) {
    btnPaywallCloseTop.addEventListener('click', () => {
      const overlay = document.getElementById('paywall-overlay');
      if (overlay) overlay.style.display = 'none';
    });
  }

  // Paddle Checkout Redirects
  const upgradePaddleButtons = document.querySelectorAll('.btn-upgrade-paddle');
  upgradePaddleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      const url = `${FOCUSSHIELD_CONFIG.checkoutUrl}?plan=${plan}`;
      chrome.tabs.create({ url });
    });
  });

  // Auth Action Bindings
  const btnAuthSignin = document.getElementById('btn-auth-signin');
  if (btnAuthSignin) {
    btnAuthSignin.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      if (!email || !password) {
        showToast('Please enter email and password.', 'error');
        return;
      }
      try {
        const loggedUser = await authService.signIn(email, password);
        showToast('Successfully signed in!', 'success');
        const isPro = await checkPremiumStatus();
        updateAccountUI();
        updateTrialBanner();
        
        // Set lastSeenSession so it doesn't trigger on reload again
        chrome.storage.local.set({ lastSeenSession: { uid: loggedUser.uid, isPremium: isPro } });
        showSyncModal('pro-login');
        const res = await syncService.restoreSettings();
        if (!res.success) {
          console.warn('[Sync] Auto-restore on login failed:', res.error);
        }

        // Re-render settings and list limits
        chrome.storage.local.get(null, (result) => {
          settings = mergeWithDefaults(result);
          applySettingsToUI();
          renderCustomSites();
        });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  const btnAuthSignup = document.getElementById('btn-auth-signup');
  if (btnAuthSignup) {
    btnAuthSignup.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      if (!email || !password) {
        showToast('Please enter email and password.', 'error');
        return;
      }
      try {
        await authService.signUp(email, password);
        showToast('Account created successfully!', 'success');
        await checkPremiumStatus();
        updateAccountUI();
        updateTrialBanner();

        // Re-render settings and list limits
        chrome.storage.local.get(null, (result) => {
          settings = mergeWithDefaults(result);
          applySettingsToUI();
          renderCustomSites();
        });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  const btnAuthSignout = document.getElementById('btn-auth-signout');
  if (btnAuthSignout) {
    btnAuthSignout.addEventListener('click', async () => {
      const wasPremium = isPremiumActive; // Store premium status before logging out
      await authService.signOut(); // Clears sessionUser from storage
      showToast('Signed out successfully.', 'success');
      
      // Clear all settings to defaults
      chrome.storage.local.clear(() => {
        chrome.storage.local.set(defaultSettings, async () => {
          await checkPremiumStatus();
          updateAccountUI();
          updateTrialBanner();

          // Set the lastSeenSession state to logged out to prevent double-alerts on reload
          chrome.storage.local.set({ lastSeenSession: { uid: null, isPremium: false } }, () => {
            if (wasPremium) {
              showSyncModal('pro-logout');
            } else {
              showSyncModal('free-logout');
            }
          });

          // Re-render settings and list limits
          chrome.storage.local.get(null, (result) => {
            settings = mergeWithDefaults(result);
            applySettingsToUI();
            renderCustomSites();
          });
        });
      });
    });
  }

  const btnSyncBackup = document.getElementById('btn-sync-backup');
  if (btnSyncBackup) {
    btnSyncBackup.addEventListener('click', async () => {
      btnSyncBackup.textContent = 'Backing up...';
      btnSyncBackup.disabled = true;
      const res = await syncService.backupSettings();
      btnSyncBackup.textContent = 'Backup';
      btnSyncBackup.disabled = false;
      if (res.success) {
        showToast('Settings backed up successfully!', 'success');
      } else {
        showToast(res.error, 'error');
      }
    });
  }

  const btnSyncRestore = document.getElementById('btn-sync-restore');
  if (btnSyncRestore) {
    btnSyncRestore.addEventListener('click', async () => {
      btnSyncRestore.textContent = 'Restoring...';
      btnSyncRestore.disabled = true;
      const res = await syncService.restoreSettings();
      btnSyncRestore.textContent = 'Restore';
      btnSyncRestore.disabled = false;
      if (res.success) {
        showToast('Settings restored successfully!', 'success');
        chrome.storage.local.get(null, (result) => {
          settings = mergeWithDefaults(result);
          applySettingsToUI();
          renderCustomSites();
        });
      } else {
        showToast(res.error, 'error');
      }
    });
  }

  // ── Listen for real-time updates from background worker ──
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_UPDATED') {
      console.log('[Popup] Settings/session updated in background, refreshing popup UI...');
      chrome.storage.local.get(null, async (result) => {
        const previousSession = settings.sessionUser || null;
        settings = mergeWithDefaults(result);
        const currentSession = settings.sessionUser || null;
        
        await checkPremiumStatus();
        updateAccountUI();
        updateTrialBanner();
        applySettingsToUI();
        renderCustomSites();
        renderSchedules();

        // Check if state changed to show modals in real time
        const nextLastSeen = currentSession ? { uid: currentSession.uid, isPremium: !!currentSession.isPremium } : { uid: null, isPremium: false };
        chrome.storage.local.set({ lastSeenSession: nextLastSeen });

        if (previousSession && !currentSession) {
          // Logged out
          if (previousSession.isPremium) {
            showSyncModal('pro-logout');
          } else {
            showSyncModal('free-logout');
          }
        } else if ((!previousSession || previousSession.uid !== currentSession?.uid) && currentSession && currentSession.isPremium) {
          // Logged in as premium
          showSyncModal('pro-login');
        }
      });
    }
  });
});

