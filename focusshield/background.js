// FocusShield Background Service Worker
importScripts('config.js', 'auth.js');

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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (result) => {
    const updated = mergeWithDefaults(result);
    if (!updated.installDate) {
      updated.installDate = Date.now();
    }
    chrome.storage.local.set(updated, () => {
      console.log('FocusShield settings initialized/migrated.');
    });
  });

  // Set up hourly alarm
  chrome.alarms.create('hourly-permanent-block-check', { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get('hourly-permanent-block-check', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('hourly-permanent-block-check', { periodInMinutes: 60 });
    }
  });
});

// Alarm Listener: hourly check
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'hourly-permanent-block-check') {
    checkAndIncrementPermanentBlocksTimeSaved();
  }
});

function checkAndIncrementPermanentBlocksTimeSaved() {
  chrome.storage.local.get(null, (result) => {
    const settings = mergeWithDefaults(result);
    const hardSites = settings.hardBlockedSites || [];
    
    // Filter active permanent blocks (expiresAt is far in the future)
    const activePermanentBlocks = hardSites.filter(s => s.expiresAt > 9000000000000 && Date.now() < s.expiresAt);
    if (activePermanentBlocks.length === 0) return;
    
    let stats = settings.focusStats || {
      streakDays: 0,
      lastActiveDate: '',
      totalSessionsCompleted: 0,
      timeSavedMinutes: 0,
      siteBlockCounts: {},
      dailyLogs: {},
      dailyFocusGoal: 4
    };
    
    const hoursSavedTotal = activePermanentBlocks.length * 60; // 60 mins per site
    stats.timeSavedMinutes = (stats.timeSavedMinutes || 0) + hoursSavedTotal;
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (!stats.dailyLogs) stats.dailyLogs = {};
    if (!stats.dailyLogs[todayStr]) {
      stats.dailyLogs[todayStr] = {
        sessions: 0,
        minutes: 0,
        siteCounts: {}
      };
    }
    
    const log = stats.dailyLogs[todayStr];
    log.minutes = (log.minutes || 0) + hoursSavedTotal;
    
    chrome.storage.local.set({ focusStats: stats }, () => {
      console.log(`Hourly check: Added ${hoursSavedTotal} mins of saved time for ${activePermanentBlocks.length} permanent blocks.`);
    });
  });
}

// Local cache of settings to make blocking checks synchronous and instant
let cachedSettings = null;

chrome.storage.local.get(null, (result) => {
  cachedSettings = result;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    chrome.storage.local.get(null, (result) => {
      cachedSettings = result;
    });
  }
});

const CATEGORIES_DB = {
  Adult: {
    domains: ['pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'onlyfans.com', 'redtube.com', 'youporn.com', 'chaturbate.com', 'tube8.com', 'stripchat.com', 'livejasmin.com', 'bongacams.com'],
    keywords: ['/porn/', '/nsfw/', '/xx/', 'pornography', 'xxx-site']
  },
  Gaming: {
    domains: ['twitch.tv', 'roblox.com', 'steamcommunity.com', 'steampowered.com', 'epicgames.com', 'itch.io', 'poki.com', 'crazygames.com', 'armorgames.com', 'ign.com', 'kotaku.com', 'miniclip.com', 'kongregate.com', 'polygon.com', 'gamerant.com', 'eurogamer.net'],
    keywords: ['/play/', '/game/', '/games/']
  },
  Shopping: {
    domains: ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.in', 'ebay.com', 'ebay.co.uk', 'aliexpress.com', 'alibaba.com', 'etsy.com', 'target.com', 'walmart.com', 'bestbuy.com', 'shopify.com', 'ikea.com', 'zara.com', 'h&m.com', 'asos.com', 'shein.com', 'temu.com'],
    keywords: ['/shop/', '/store/', '/checkout/', '/cart/']
  },
  Gambling: {
    domains: ['bet365.com', 'bwin.com', '888casino.com', 'betonline.ag', 'draftkings.com', 'fanduel.com', 'pokerstars.com', 'stake.com', 'roobet.com', 'betfair.com', 'williamhill.com', 'ladbrokes.com', 'betway.com', 'jackpot.com', 'lottery.com'],
    keywords: ['/casino/', '/betting/', '/gamble/', '/poker/', '/jackpot/', '/slots/']
  },
  Streaming: {
    domains: ['netflix.com', 'hulu.com', 'disneyplus.com', 'max.com', 'hbo.com', 'vimeo.com', 'dailymotion.com', 'crunchyroll.com', 'primevideo.com', 'peacocktv.com', 'paramountplus.com', 'tubitv.com', 'pluto.tv'],
    keywords: ['/watch/', '/video/', '/videos/', '/movie/', '/movies/']
  }
};

function getPlatform(hostname) {
  const host = hostname.toLowerCase();
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('facebook.com') || host.includes('messenger.com')) return 'facebook';
  if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('reddit.com')) return 'reddit';
  if (host.includes('tiktok.com')) return 'tiktok';
  return null;
}

function getMatchingCategory(hostname, path, settings) {
  if (!settings) return null;
  const categoryMapping = {
    Adult: settings.filterAdult === true,
    Gaming: settings.filterGaming === true,
    Shopping: settings.filterShopping === true,
    Gambling: settings.filterGambling === true,
    Streaming: settings.filterStreaming === true
  };
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '');
  const cleanPath = path.toLowerCase();
  for (const [category, enabled] of Object.entries(categoryMapping)) {
    if (!enabled) continue;
    const db = CATEGORIES_DB[category];
    if (!db) continue;
    const matchDomain = db.domains.some(d => cleanHost === d || cleanHost.endsWith('.' + d));
    if (matchDomain) return category;
    const matchKeyword = db.keywords.some(kw => cleanPath.includes(kw));
    if (matchKeyword) return category;
  }
  return null;
}

function checkPremium(settings) {
  if (!settings) return false;
  if (settings.sessionUser && settings.sessionUser.isPremium) return true;
  const install = settings.installDate || Date.now();
  if (Date.now() - install < 7 * 24 * 60 * 60 * 1000) return true;
  return false;
}

function checkBlockedUrl(urlStr, settings) {
  if (!settings || settings.masterToggle === false) return null;
  try {
    const url = new URL(urlStr);
    if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') return null;
    
    const hostname = url.hostname.toLowerCase();
    const currentHostname = hostname.replace(/^www\./, '');
    const path = url.pathname;
    
    // 1. HARD BLOCK CHECK
    const hardBlockedSites = settings.hardBlockedSites || [];
    const hardEntry = hardBlockedSites.find(s => {
      const d = s.domain.toLowerCase().replace(/^www\./, '');
      return currentHostname === d || currentHostname.endsWith('.' + d);
    });
    
    if (hardEntry) {
      if (Date.now() < hardEntry.expiresAt) {
        return chrome.runtime.getURL('hard-blocked.html')
          + '?site='        + encodeURIComponent(url.hostname)
          + '&expiresAt='   + encodeURIComponent(hardEntry.expiresAt)
          + '&originalUrl=' + encodeURIComponent(urlStr);
      }
    }
    
    // 2. SCHEDULE BLOCK CHECK
    const schedules = settings.schedules || [];
    const activeSchedule = schedules.find(sched => {
      if (!sched.enabled) return false;
      const d = sched.domain.toLowerCase().replace(/^www\./, '');
      const matches = currentHostname === d || currentHostname.endsWith('.' + d);
      return matches && isScheduleActive(sched);
    });
    
    if (activeSchedule) {
      return chrome.runtime.getURL('hard-blocked.html') 
        + '?site=' + encodeURIComponent(url.hostname)
        + '&type=schedule'
        + '&startTime=' + encodeURIComponent(activeSchedule.startTime)
        + '&endTime=' + encodeURIComponent(activeSchedule.endTime)
        + '&days=' + encodeURIComponent(activeSchedule.days.join(','))
        + '&originalUrl=' + encodeURIComponent(urlStr);
    }
    
    // 3. CATEGORY FILTER CHECK
    const matchedCategory = getMatchingCategory(url.hostname, path, settings);
    if (matchedCategory) {
      const bypasses = settings.filterBypasses || {};
      const bypassExpiry = bypasses[currentHostname] || 0;
      if (Date.now() < bypassExpiry) {
        // Bypassed
      } else {
        const displayNameMap = {
          Adult: 'Adult & NSFW',
          Gaming: 'Gaming & Esports',
          Shopping: 'Shopping & E-Commerce',
          Gambling: 'Gambling & Betting',
          Streaming: 'Streaming & Entertainment'
        };
        const categoryName = displayNameMap[matchedCategory] || matchedCategory;
        return chrome.runtime.getURL('hard-blocked.html') 
          + '?site=' + encodeURIComponent(categoryName)
          + '&type=filter'
          + '&domain=' + encodeURIComponent(currentHostname)
          + '&originalUrl=' + encodeURIComponent(urlStr);
      }
    }
    
    // 4. PLATFORMS FULL BLOCK
    const platform = getPlatform(url.hostname);
    if (platform) {
      if (settings[platform] && settings[platform].blockFullSite === true) {
        return chrome.runtime.getURL('hard-blocked.html') 
          + '?site=' + encodeURIComponent(url.hostname)
          + '&originalUrl=' + encodeURIComponent(urlStr);
      }
      
      const isEnabled = settings[platform] && settings[platform].enabled !== false;
      if (isEnabled) {
        if (platform === 'youtube' && settings.youtube && settings.youtube.shorts) {
          if (path.startsWith('/shorts')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=youtube.com/shorts'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
        }
        if (platform === 'facebook' && settings.facebook) {
          const fb = settings.facebook;
          if (fb.reels && (path.startsWith('/reels') || path.startsWith('/reel'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/reels'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (fb.messenger && path.startsWith('/messages')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/messages'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (fb.messenger && url.hostname.includes('messenger.com')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=messenger.com'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (fb.friends && (path.startsWith('/friends') || path.startsWith('/friends/'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/friends'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (fb.groups && (path.startsWith('/groups') || path.startsWith('/groups/'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/groups'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (fb.pages && (path.startsWith('/pages') || path.startsWith('/pages/'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/pages'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
        }
        if (platform === 'twitter' && settings.twitter) {
          const tw = settings.twitter;
          if (tw.messages && (path.startsWith('/messages') || path.startsWith('/chat'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=x.com/messages'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          const isExploreOrSearch = path.startsWith('/explore') || 
                                    path.startsWith('/search') || 
                                    path.startsWith('/trends') || 
                                    path.includes('/trends') || 
                                    path.startsWith('/i/trends');
          if ((tw.explore || tw.feed) && isExploreOrSearch) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=x.com/explore'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
        }
        if (platform === 'instagram' && settings.instagram) {
          const ig = settings.instagram;
          if (ig.reels && (path.startsWith('/reels') || path.startsWith('/reel'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/reels'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (ig.explore && path.startsWith('/explore')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/explore'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (ig.shopping && (path.startsWith('/shop') || path.startsWith('/shopping'))) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/shop'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (ig.messages && path.startsWith('/direct')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/direct'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (ig.stories && path.startsWith('/stories')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/stories'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
        }
        if (platform === 'reddit' && settings.reddit) {
          const rd = settings.reddit;
          const cleanPath = '/' + path.split('/').filter(Boolean).join('/');
          const isPopular = cleanPath === '/r/popular' || cleanPath.startsWith('/r/popular/');
          const isAll = cleanPath === '/r/all' || cleanPath.startsWith('/r/all/');
          const isNews = cleanPath === '/news' || cleanPath.startsWith('/news/');
          const isExplore = cleanPath === '/explore' || cleanPath.startsWith('/explore/');
          if (rd.popularAll && (isPopular || isAll || isNews || isExplore)) {
            let label = 'reddit.com/r/popular';
            if (isAll) label = 'reddit.com/r/all';
            else if (isNews) label = 'reddit.com/news';
            else if (isExplore) label = 'reddit.com/explore';
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=' + encodeURIComponent(label)
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
        }
        if (platform === 'tiktok' && settings.tiktok) {
          const tt = settings.tiktok;
          if (tt.foryou && (path === '/' || path === '/foryou' || path === '/recommend' || path === '/explore')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/foryou'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (tt.following && path.startsWith('/following')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/following'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (tt.live && path.startsWith('/live')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/live'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (tt.shop && path.startsWith('/shop')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/shop'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (tt.search && path.startsWith('/search')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/search'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
          if (tt.upload && path.startsWith('/upload')) {
            return chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/upload'
              + '&type=subfeature'
              + '&originalUrl=' + encodeURIComponent(urlStr);
          }
        }
      }
    }
    
    // 5. CUSTOM SITES LIST CHECK
    const isCustomSite = settings.customSites && settings.customSites.some(site => {
      if (site.enabled === false) return false;
      const domain = site.domain.toLowerCase().replace(/^www\./, '');
      return currentHostname === domain || currentHostname.endsWith('.' + domain);
    });
    
    if (isCustomSite && hardEntry && Date.now() < hardEntry.expiresAt) {
      return chrome.runtime.getURL('hard-blocked.html') 
        + '?site=' + encodeURIComponent(url.hostname)
        + '&expiresAt=' + encodeURIComponent(hardEntry.expiresAt)
        + '&originalUrl=' + encodeURIComponent(urlStr);
    }
  } catch (e) {
    console.error('Error parsing URL in checkBlockedUrl:', e);
  }
  return null;
}

// TAB LISTENER: When tab updates, apply rules and send settings to content.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const url = changeInfo.url;
    if (!url.startsWith(chrome.runtime.getURL(''))) {
      const redirectUrl = checkBlockedUrl(url, cachedSettings);
      if (redirectUrl) {
        chrome.tabs.update(tabId, { url: redirectUrl });
        return;
      }
    }
  }
  
  if (changeInfo.status === 'complete' && tab.url) {
    if (cachedSettings && cachedSettings.masterToggle !== undefined) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SETTINGS_UPDATED',
        settings: cachedSettings
      }).catch(() => {
        // Ignore error for non-matching URLs where content script is not injected
      });
    }
  }
});

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

// Helper to log stats when schedule block is triggered
function recordScheduleBlockInStats(domain, sched) {
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
  const nowTime = Date.now();

  chrome.storage.local.get(['focusStats', 'lastBlockEvent'], (result) => {
    // Prevent duplicate block counts within a 5-second window (e.g. page redirects)
    const lastEvent = result.lastBlockEvent || {};
    if (lastEvent.domain === cleanDomain && (nowTime - lastEvent.timestamp) < 5000) {
      console.log(`Deduplicated block count for ${cleanDomain}`);
      return;
    }

    // Update the last block event timestamp
    const newEvent = { domain: cleanDomain, timestamp: nowTime };
    chrome.storage.local.set({ lastBlockEvent: newEvent });

    let stats = result.focusStats || {
      streakDays: 0,
      lastActiveDate: '',
      totalSessionsCompleted: 0,
      timeSavedMinutes: 0,
      siteBlockCounts: {},
      dailyLogs: {},
      dailyFocusGoal: 4
    };

    // Increment completed blocks/sessions
    stats.totalSessionsCompleted = (stats.totalSessionsCompleted || 0) + 1;

    // Calculate time saved: use active schedule actual selected duration
    let minsSaved = 30; // Default 30 mins deep work
    if (sched && sched.startTime && sched.endTime) {
      try {
        const [startH, startM] = sched.startTime.split(':').map(Number);
        const [endH, endM] = sched.endTime.split(':').map(Number);
        let durationMins = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMins < 0) {
          // Spans across midnight
          durationMins += 24 * 60;
        }
        if (durationMins > 0) {
          minsSaved = durationMins; // Use actual selected schedule duration!
        }
      } catch (e) {}
    }
    stats.timeSavedMinutes = (stats.timeSavedMinutes || 0) + minsSaved;

    // Site counts
    if (!stats.siteBlockCounts) stats.siteBlockCounts = {};
    stats.siteBlockCounts[cleanDomain] = (stats.siteBlockCounts[cleanDomain] || 0) + 1;

    // Daily Logs
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

    // Update streak logic
    if (stats.lastActiveDate !== todayStr) {
      if (stats.lastActiveDate) {
        const lastDate = new Date(stats.lastActiveDate);
        const diffTime = now.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
        if (diffDays === 1) {
          stats.streakDays = (stats.streakDays || 0) + 1;
        } else if (diffDays > 1) {
          stats.streakDays = 1;
        }
      } else {
        stats.streakDays = 1;
      }
      stats.lastActiveDate = todayStr;
    }

    chrome.storage.local.set({ focusStats: stats });
  });
}

// REAL-TIME BACKGROUND SCHEDULE MONITOR: Auto-redirect open tabs when schedule starts
function checkActiveSchedulesForAllTabs() {
  chrome.storage.local.get(null, async (result) => {
    const settings = mergeWithDefaults(result);
    
    // Check if premium is active
    const isPremium = await authService.isPremium();
    if (!isPremium) return;

    const schedules = settings.schedules || [];
    if (schedules.length === 0) return;

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.url || !tab.url.startsWith('http')) return;
        try {
          const url = new URL(tab.url);
          const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

          const activeSchedule = schedules.find(sched => {
            if (!sched.enabled) return false;
            const d = sched.domain.toLowerCase().replace(/^www\./, '');
            const matches = hostname === d || hostname.endsWith('.' + d);
            return matches && isScheduleActive(sched);
          });

          if (activeSchedule) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=' + encodeURIComponent(hostname)
              + '&type=schedule'
              + '&startTime=' + encodeURIComponent(activeSchedule.startTime)
              + '&endTime=' + encodeURIComponent(activeSchedule.endTime)
              + '&days=' + encodeURIComponent(activeSchedule.days.join(','))
              + '&returnUrl=' + encodeURIComponent(tab.referrer || '')
              + '&originalUrl=' + encodeURIComponent(tab.url);
            
            chrome.tabs.update(tab.id, { url: blockedUrl });
            
            // Record schedule block attempt in analytics!
            recordScheduleBlockInStats(hostname, activeSchedule);
          }
        } catch (e) {}
      });
    });
  });
}

setInterval(checkActiveSchedulesForAllTabs, 2000);

function updateBadgeText() {
  chrome.storage.local.get(null, (result) => {
    const settings = mergeWithDefaults(result);
    if (settings.iconBadgeEnabled === false || !settings.masterToggle) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const stats = settings.focusStats || {};
    const dailyLogs = stats.dailyLogs || {};
    const todayData = dailyLogs[todayStr] || {};
    const count = todayData.sessions || 0;

    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: '#3ddc84' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.focusStats || changes.iconBadgeEnabled !== undefined || changes.masterToggle !== undefined) {
      updateBadgeText();
    }
  }
});

// Initialize on background load
updateBadgeText();

// ── SYNC AUTH SESSION FROM WEBSITE ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_WEBSITE_SESSION') {
    chrome.storage.local.set({ sessionUser: message.session }, () => {
      console.log('[Background] Synced session from website:', message.session);
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: { sessionUser: message.session } }, () => {
        if (chrome.runtime.lastError) { /* ignore if popup is closed */ }
      });
      sendResponse({ success: true });
    });
    return true;
  }
  if (message.type === 'CLEAR_WEBSITE_SESSION') {
    chrome.storage.local.remove(['sessionUser'], () => {
      console.log('[Background] Cleared session (website logout)');
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: { sessionUser: null } }, () => {
        if (chrome.runtime.lastError) { /* ignore if popup is closed */ }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});
