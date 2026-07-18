// FocusShield Content Script - High Performance CSS Injection Method
(function () {
  function checkPremium(settings) {
    if (!settings) return false;
    if (settings.sessionUser && settings.sessionUser.isPremium) {
      return true;
    }
    const install = settings.installDate || Date.now();
    if (Date.now() - install < 7 * 24 * 60 * 60 * 1000) {
      return true;
    }
    return false;
  }

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
    filterBypasses: {}
  };

  function mergeWithDefaults(stored) {
    const merged = { ...defaultSettings };
    if (stored) {
      if (stored.masterToggle !== undefined) merged.masterToggle = stored.masterToggle;
      const platforms = ['youtube', 'facebook', 'instagram', 'reddit', 'tiktok', 'twitter'];
      platforms.forEach(p => {
        if (stored[p] && typeof stored[p] === 'object') {
          merged[p] = { ...defaultSettings[p], ...stored[p] };
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
    }
    return merged;
  }

  let platformInterval = null;

  function isSubfeatureBypassed(key) {
    if (!currentSettings || !currentSettings.filterBypasses) return false;
    const expiry = currentSettings.filterBypasses[key];
    return expiry && Date.now() < expiry;
  }

  function injectDOMBlockScreen(siteLabel) {
    if (platformInterval) {
      clearInterval(platformInterval);
      platformInterval = null;
    }

    document.title = 'FocusShield - Site Blocked';

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
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const overlay = document.createElement('div');
    overlay.id = 'focusshield-block-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.07) 0%, #09090b 80%), #09090b !important;
      color: #f4f4f5 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 2147483647 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      padding: 32px 24px !important;
      box-sizing: border-box !important;
    `;

    overlay.innerHTML = `
      <div style="position: absolute !important; top: 32px !important; left: 40px !important; display: flex !important; align-items: center !important; gap: 8px !important; opacity: 0.6 !important; user-select: none !important;">
        <div style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <span style="font-size: 14px !important; font-weight: 600 !important; color: #f4f4f5 !important; letter-spacing: -0.01em !important;">FocusShield</span>
      </div>
      <div style="width: 100% !important; max-width: 680px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 36px !important; text-align: center !important;">
        <div style="position: relative !important; width: 110px !important; height: 110px !important; display: flex !important; justify-content: center !important; align-items: center !important;">
          <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 72px !important; height: 72px !important; filter: drop-shadow(0 0 25px rgba(34, 197, 94, 0.4)) !important;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div style="text-align: center !important;">
          <h1 style="font-size: 36px !important; font-weight: 800 !important; margin-bottom: 12px !important; letter-spacing: -0.03em !important; background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%) !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; color: #fff !important; margin-top: 0 !important;">You're in Focus Mode</h1>
          <p style="font-size: 16px !important; color: #71717a !important; font-weight: 400 !important; max-width: 500px !important; margin: 0 auto !important; line-height: 1.5 !important;">\${siteLabel} is blocked to keep you focused</p>
        </div>
        <div style="width: 100% !important; max-width: 600px !important; padding: 0 !important; margin: 12px 0 !important; text-align: center !important;">
          <p style="font-size: 20px !important; font-style: italic !important; color: #d4d4d8 !important; line-height: 1.6 !important; font-weight: 400 !important; margin: 0 !important;">"\${randomQuote}"</p>
        </div>
      </div>
    `;

    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    if (document.body) {
      document.body.style.setProperty('overflow', 'hidden', 'important');
    }

    const appendOverlay = () => {
      if (document.getElementById('focusshield-block-overlay')) return;
      document.documentElement.appendChild(overlay);
    };

    if (document.documentElement) {
      appendOverlay();
    } else {
      document.addEventListener('DOMContentLoaded', appendOverlay);
    }

    const observer = new MutationObserver(() => {
      if (!document.getElementById('focusshield-block-overlay')) {
        document.documentElement.appendChild(overlay);
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }

  function runPlatformBackgroundChecks(settings) {
    if (platformInterval) {
      clearInterval(platformInterval);
      platformInterval = null;
    }

    const hostname = window.location.hostname;

    // Cleanup attribute if disabled/null
    if (!settings || !settings.masterToggle || !settings.facebook || settings.facebook.enabled === false || !settings.facebook.feed) {
      if (hostname.includes('facebook.com')) {
        document.documentElement.removeAttribute('data-fs-fb-home');
      }
    }
    if (!settings || !settings.masterToggle || !settings.twitter || settings.twitter.enabled === false || !settings.twitter.feed) {
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        document.documentElement.removeAttribute('data-fs-tw-home');
      }
    }
    if (!settings || !settings.masterToggle || !settings.reddit || settings.reddit.enabled === false) {
      if (hostname.includes('reddit.com')) {
        document.documentElement.removeAttribute('data-fs-rd-popular');
        document.documentElement.removeAttribute('data-fs-rd-all');
        document.documentElement.removeAttribute('data-fs-rd-chat');
        document.documentElement.removeAttribute('data-fs-rd-home');
      }
    }

    if (!settings || !settings.masterToggle) return;

    const platform = getPlatform(hostname);
    const isPremium = checkPremium(settings);
    if (platform && settings[platform] && settings[platform].enabled !== false) {
      const isFullSiteBlock = settings[platform].blockFullSite === true;
      if (isFullSiteBlock) {
        const hardList = settings.hardBlockedSites || [];
        let hardEntry = hardList.find(s => s.domain.toLowerCase().includes(platform) || hostname.toLowerCase().includes(s.domain.toLowerCase()));
        if (!hardEntry && !isPremium) {
          hardEntry = { expiresAt: 9999999999999 };
        }
        if (hardEntry && Date.now() < hardEntry.expiresAt) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent(window.location.hostname)
            + '&expiresAt=' + encodeURIComponent(hardEntry.expiresAt)
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
      }
    }

    // 1. YouTube checks (Autoplay disabler & Shorts blocker)
    if (hostname.includes('youtube.com') && settings.youtube && settings.youtube.enabled !== false) {
      const yt = settings.youtube;
      const runYtChecks = () => {
        if (yt.autoplay) {
          const toggle = document.querySelector('.ytp-autonav-toggle-button');
          if (toggle && toggle.getAttribute('aria-checked') === 'true') {
            toggle.click();
          }
        }
        if (yt.shorts && window.location.pathname.startsWith('/shorts') && !isSubfeatureBypassed('youtube.com/shorts')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('youtube.com/shorts')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
      };
      runYtChecks();
      platformInterval = setInterval(runYtChecks, 500);
    }

    // 2. Facebook checks (Reels, Messenger, Friends, Groups, Pages & Home Feed attribute)
    if ((hostname.includes('facebook.com') || hostname.includes('messenger.com')) && settings.facebook && settings.facebook.enabled !== false) {
      const fb = settings.facebook;
      const runFbChecks = () => {
        // Update home feed block class
        const isFBHome = window.location.pathname === '/' || window.location.pathname === '/home.php';
        if (fb.feed && isFBHome) {
          document.documentElement.setAttribute('data-fs-fb-home', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-fb-home');
        }

        if (fb.reels && (window.location.pathname.startsWith('/reels') || window.location.pathname.startsWith('/reel')) && !isSubfeatureBypassed('facebook.com/reels')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('facebook.com/reels')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        if (fb.messenger && window.location.pathname.startsWith('/messages') && !isSubfeatureBypassed('facebook.com/messages')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('facebook.com/messages')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        if (fb.friends && (window.location.pathname.startsWith('/friends') || window.location.pathname.startsWith('/friends/')) && !isSubfeatureBypassed('facebook.com/friends')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('facebook.com/friends')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        if (fb.groups && (window.location.pathname.startsWith('/groups') || window.location.pathname.startsWith('/groups/')) && !isSubfeatureBypassed('facebook.com/groups')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('facebook.com/groups')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        if (fb.pages && (window.location.pathname.startsWith('/pages') || window.location.pathname.startsWith('/pages/')) && !isSubfeatureBypassed('facebook.com/pages')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('facebook.com/pages')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
      };
      runFbChecks();
      platformInterval = setInterval(runFbChecks, 500);
    }

    // 3. Twitter/X checks (Messages, Explore, Communities, Notifications & Home Feed blocker)
    if ((hostname.includes('twitter.com') || hostname.includes('x.com')) && settings.twitter && settings.twitter.enabled !== false) {
      const tw = settings.twitter;
      const runTwChecks = () => {
        // Home Feed blocker class toggler
        const isTwHome = window.location.pathname === '/home' || window.location.pathname === '/';
        if (tw.feed && isTwHome) {
          document.documentElement.setAttribute('data-fs-tw-home', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-tw-home');
        }

        if (tw.messages && (window.location.pathname.startsWith('/messages') || window.location.pathname.startsWith('/chat')) && !isSubfeatureBypassed('x.com/messages')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('x.com/messages')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        const isExploreOrSearch = window.location.pathname.startsWith('/explore') || 
                                  window.location.pathname.startsWith('/search') || 
                                  window.location.pathname.startsWith('/trends') || 
                                  window.location.pathname.includes('/trends') || 
                                  window.location.pathname.startsWith('/i/trends');
        if ((tw.explore || tw.feed) && isExploreOrSearch && !isSubfeatureBypassed('x.com/explore')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('x.com/explore')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        if (tw.communities && window.location.pathname.includes('/communities') && !isSubfeatureBypassed('x.com/communities')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('x.com/communities')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
        if (tw.notifications && window.location.pathname.startsWith('/notifications') && !isSubfeatureBypassed('x.com/notifications')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('x.com/notifications')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
        }
      };
      runTwChecks();
      platformInterval = setInterval(runTwChecks, 500);
    }

    // 3.5. Instagram checks (Reels, Explore, Shop redirection & In-feed content cleaners)
    if (hostname.includes('instagram.com') && settings.instagram && settings.instagram.enabled !== false) {
      const ig = settings.instagram;
      const runIgChecks = () => {
        const path = window.location.pathname.toLowerCase();
        
        // Check Login State and Home Feed
        const isIgHome = path === '/' || path === '/home';
        const isLoggedIn = !!(
          document.querySelector('svg[aria-label="Home"]') || 
          document.querySelector('a[href^="/direct/"]') || 
          document.querySelector('a[href^="/explore/"]') || 
          document.querySelector('a[href*="/reels/"]') || 
          document.querySelector('[role="navigation"]') ||
          document.querySelector('main [role="menu"]')
        );

        if (ig.feed && isIgHome && isLoggedIn) {
          document.documentElement.setAttribute('data-fs-ig-home', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-ig-home');
        }

        // Redirects
        if (ig.reels && (path.startsWith('/reels') || path.startsWith('/reel')) && !isSubfeatureBypassed('instagram.com/reels')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('instagram.com/reels')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (ig.explore && path.startsWith('/explore') && !isSubfeatureBypassed('instagram.com/explore')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('instagram.com/explore')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (ig.shopping && (path.startsWith('/shop') || path.startsWith('/shopping')) && !isSubfeatureBypassed('instagram.com/shop')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('instagram.com/shop')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (ig.messages && path.startsWith('/direct') && !isSubfeatureBypassed('instagram.com/direct')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('instagram.com/direct')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (ig.stories && path.startsWith('/stories') && !isSubfeatureBypassed('instagram.com/stories')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('instagram.com/stories')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }

        // DOM Pruning for Sponsored Content
        if (ig.sponsored) {
          // 1. Target feed posts (articles)
          document.querySelectorAll('article').forEach(article => {
            // Check Sponsored
            const adKeywords = [
              'sponsored', 'sponsorisé', 'gesponsert', 'sponsorizzato', 'patrocinado', 'реклама', 
              'sponsrad', 'sponsoreret', 'sponsoroitu', 'reklama', 'sponsorlu', '广告', '赞助', '贊助'
            ];
            const ctaKeywords = [
              'learn more', 'shop now', 'sign up', 'book now', 'download', 'watch more', 'apply now', 
              'subscribe', 'install now', 'order now', 'play game'
            ];
            
            const headerAndLinksText = Array.from(article.querySelectorAll('header, a, button'))
              .map(el => (el.innerText || el.textContent || '').trim().toLowerCase())
              .join(' ');
            
            const isSponsored = adKeywords.some(kw => headerAndLinksText.includes(kw)) ||
                                ctaKeywords.some(kw => headerAndLinksText.includes(kw)) ||
                                article.querySelector('use[href*="Sponsored"]') || 
                                article.querySelector('svg aria-label*="Sponsored"') ||
                                article.querySelector('a[href*="/about/ads"]');
                                
            if (isSponsored) {
              article.style.setProperty('display', 'none', 'important');
            }
          });
        }

        // Hide navigation links and stories in JS
        if (ig.reels) {
          document.querySelectorAll('div').forEach(div => {
            const txt = (div.innerText || div.textContent || '').trim().toLowerCase();
            if (txt === 'reels' || txt === 'suggested reels') {
              let container = div;
              for (let i = 0; i < 4; i++) {
                if (container.parentElement) container = container.parentElement;
              }
              if (container && container !== document.body) {
                container.style.setProperty('display', 'none', 'important');
              }
            }
          });
          document.querySelectorAll('a[href^="/reels"], a[href^="/reel"], a[href*="/reels/"], a[href*="/reel/"], a[aria-label*="Reels"], a[aria-label*="reels"], a:has([aria-label*="Reels"]), a:has([aria-label*="reels"]), div[role="button"]:has([aria-label*="Reels"]), div[role="button"]:has([aria-label*="reels"]), svg[aria-label*="Reels"], svg[aria-label*="reels"]').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
        }
        if (ig.explore) {
          document.querySelectorAll('a[href^="/explore"], a[href*="/explore/"], a[aria-label*="Explore"], a[aria-label*="explore"], a:has([aria-label*="Explore"]), a:has([aria-label*="explore"]), div[role="button"]:has([aria-label*="Explore"]), div[role="button"]:has([aria-label*="explore"]), svg[aria-label*="Explore"], svg[aria-label*="explore"]').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
        }
        if (ig.shopping) {
          document.querySelectorAll('a[href="/shop/"], a[href*="/shop"], a[href*="/shopping"], a[aria-label*="Shop"], a:has([aria-label*="Shop"]), a:has([aria-label*="shop"]), svg[aria-label*="Shop"]').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
        }
        if (ig.messages) {
          document.querySelectorAll('a[href*="/direct"], a[href*="direct"], svg[aria-label*="Messenger"], svg[aria-label*="Direct"], svg[aria-label*="Messages"], [aria-label*="Messenger"], [aria-label*="Direct"], [aria-label*="Messages"]').forEach(el => {
            let navItem = el;
            if (el.tagName === 'SVG' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
              let parent = el.parentElement;
              let depth = 0;
              while (parent && parent !== document.body && depth < 4) {
                if (parent.tagName === 'A' || parent.getAttribute('role') === 'link' || parent.getAttribute('role') === 'button') {
                  navItem = parent;
                  break;
                }
                parent = parent.parentElement;
                depth++;
              }
            }
            if (navItem) {
              navItem.style.setProperty('display', 'none', 'important');
              if (navItem.parentElement && navItem.parentElement.tagName === 'DIV' && navItem.parentElement.children.length === 1) {
                navItem.parentElement.style.setProperty('display', 'none', 'important');
              }
            }
          });
        }
        if (ig.notifications) {
          document.querySelectorAll('a[href*="notifications"], svg[aria-label*="Notifications"], svg[aria-label*="Activity"], svg[aria-label*="Heart"], [aria-label*="Notifications"], [aria-label*="Activity"], [aria-label*="Heart"]').forEach(el => {
            let navItem = el;
            if (el.tagName === 'SVG' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
              let parent = el.parentElement;
              let depth = 0;
              while (parent && parent !== document.body && depth < 4) {
                if (parent.tagName === 'A' || parent.getAttribute('role') === 'link' || parent.getAttribute('role') === 'button') {
                  navItem = parent;
                  break;
                }
                parent = parent.parentElement;
                depth++;
              }
            }
            if (navItem) {
              navItem.style.setProperty('display', 'none', 'important');
              if (navItem.parentElement && navItem.parentElement.tagName === 'DIV' && navItem.parentElement.children.length === 1) {
                navItem.parentElement.style.setProperty('display', 'none', 'important');
              }
            }
          });
        }
        if (ig.stories) {
          document.querySelectorAll('a[href*="/stories/"]').forEach(link => {
            link.style.setProperty('display', 'none', 'important');
            let parent = link.parentElement;
            let depth = 0;
            while (parent && parent !== document.body && depth < 4) {
              if (parent.tagName === 'LI' || parent.getAttribute('role') === 'listitem' || parent.getAttribute('role') === 'menuitem') {
                parent.style.setProperty('display', 'none', 'important');
                break;
              }
              parent = parent.parentElement;
              depth++;
            }
          });
          
          document.querySelectorAll('ul, div[role="menu"]').forEach(container => {
            if (container.querySelector('a[href*="/stories/"]')) {
              container.style.setProperty('display', 'none', 'important');
              let parent = container.parentElement;
              if (parent && parent !== document.body && parent.tagName !== 'MAIN' && parent.tagName !== 'SECTION' && parent.tagName !== 'BODY') {
                parent.style.setProperty('display', 'none', 'important');
              }
            }
          });

          document.querySelectorAll('[aria-label*="Stories"], [aria-label*="stories"]').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
        }
        if (ig.comments) {
          // Hide comment inputs/forms
          document.querySelectorAll('form:has(textarea), textarea[placeholder*="comment"], textarea[placeholder*="Comment"]').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
          
          // Hide comment buttons (bubble icons)
          document.querySelectorAll('svg, [aria-label*="Comment"], [aria-label*="comment"]').forEach(el => {
            const label = el.getAttribute('aria-label') || '';
            const hasCommentLabel = label.toLowerCase().includes('comment');
            let isCommentEl = hasCommentLabel;
            if (el.tagName === 'SVG') {
              const titleEl = el.querySelector('title');
              if (titleEl && titleEl.textContent.toLowerCase().includes('comment')) {
                isCommentEl = true;
              }
            }

            if (isCommentEl) {
              el.style.setProperty('display', 'none', 'important');
              let parent = el.parentElement;
              let depth = 0;
              while (parent && parent !== document.body && depth < 4) {
                const tag = parent.tagName;
                if (tag === 'BUTTON' || tag === 'A' || parent.getAttribute('role') === 'button') {
                  parent.style.setProperty('display', 'none', 'important');
                  break;
                }
                parent = parent.parentElement;
                depth++;
              }
            }
          });

          // Hide feed post view-all-comments links
          document.querySelectorAll('div, span, a').forEach(el => {
            if (el.children.length === 0) {
              const txt = (el.textContent || '').trim().toLowerCase();
              if (txt.includes('view all') && txt.includes('comments')) {
                el.style.setProperty('display', 'none', 'important');
                if (el.parentElement) {
                  el.parentElement.style.setProperty('display', 'none', 'important');
                }
              }
            }
          });

          // Hide comments list on detail pages/dialogs (li:not(:first-child) inside the comments container)
          document.querySelectorAll('div[role="dialog"] ul > li:not(:first-child), main ul > li:not(:first-child)').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
        }
      };
      runIgChecks();
      platformInterval = setInterval(runIgChecks, 500);
    }

    // 4. Reddit checks (Popular, All, Chat blocker & Shadow DOM styling)
    if (hostname.includes('reddit.com') && settings.reddit && settings.reddit.enabled !== false) {
      const rd = settings.reddit;
      const runRedditChecks = () => {
        const cleanPath = '/' + window.location.pathname.toLowerCase().split('/').filter(Boolean).join('/');
        const isPopular = cleanPath === '/r/popular' || cleanPath.startsWith('/r/popular/');
        const isAll = cleanPath === '/r/all' || cleanPath.startsWith('/r/all/');
        const isHome = cleanPath === '/' || cleanPath === '/best' || cleanPath === '/hot' || cleanPath === '/new' || cleanPath === '/top' || cleanPath === '/rising';
        const isNews = cleanPath === '/news' || cleanPath.startsWith('/news/');
        const isExplore = cleanPath === '/explore' || cleanPath.startsWith('/explore/');
        const isChatSubdomain = hostname === 'chat.reddit.com' || hostname.endsWith('.chat.reddit.com');
        const isChatPath = cleanPath === '/chat' || cleanPath.startsWith('/chat/') || cleanPath === '/message' || cleanPath.startsWith('/message/');
        const isChat = isChatSubdomain || isChatPath;

        if (rd.popularAll && isPopular) {
          document.documentElement.setAttribute('data-fs-rd-popular', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-rd-popular');
        }

        if (rd.popularAll && isAll) {
          document.documentElement.setAttribute('data-fs-rd-all', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-rd-all');
        }

        if (rd.popularAll && isHome) {
          document.documentElement.setAttribute('data-fs-rd-home', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-rd-home');
        }

        if (rd.chatDMs && isChat) {
          document.documentElement.setAttribute('data-fs-rd-chat', 'true');
        } else {
          document.documentElement.removeAttribute('data-fs-rd-chat');
        }

        // Shadow DOM style injection
        const shadowHosts = document.querySelectorAll('shreddit-post-action-row, shreddit-post, shreddit-header, reddit-header-large, reddit-header, shreddit-app');
        
        let commentCSS = '';
        if (rd.commentsSection) {
          commentCSS = `
            a[href*="/comments/"], 
            [href*="/comments/"], 
            faceplate-tracker[noun="comments"], 
            faceplate-icon[name="comment"], 
            faceplate-icon[name="comment-outline"], 
            faceplate-icon[name*="comment"], 
            a:has(faceplate-icon[name*="comment"]), 
            button:has(faceplate-icon[name*="comment"]),
            [data-testid="post-comment-button"], 
            [aria-label*="comment"], 
            [aria-label*="Comment"], 
            [data-testid*="comment"],
            faceplate-tracker:has(a[href*="/comments/"]),
            faceplate-tracker:has([href*="/comments/"]),
            [noun="comments"] {
              display: none !important;
            }
          `;
        }

        let chatDMsCSS = '';
        if (rd.chatDMs) {
          chatDMsCSS = `
            a[href*="chat"],
            #chat-button,
            [aria-label="Chat"],
            [aria-label*="Chat"],
            [aria-label*="chat"],
            [data-testid="chat-button"],
            iframe[src*="chat.reddit.com"],
            a[href*="/message/inbox"],
            a[href*="/message/compose"],
            a[href*="/message/sent"],
            a[href*="/message/"],
            a[href*="/messages"],
            a[href*="message"],
            [aria-label*="Inbox"],
            [aria-label*="inbox"],
            [data-testid="inbox-button"],
            faceplate-icon[name="chat"],
            faceplate-icon[name="chat-outline"],
            faceplate-icon[name*="chat"],
            faceplate-icon[name="inbox"],
            faceplate-icon[name="mail"],
            faceplate-icon[name*="mail"],
            faceplate-tracker:has(a[href*="chat"]),
            faceplate-tracker:has(button[aria-label*="chat"]),
            faceplate-tracker:has(button[aria-label*="Chat"]),
            faceplate-tracker:has(a[href*="message"]),
            faceplate-tracker:has(a[href*="inbox"]),
            faceplate-tracker:has(a[href*="/message/inbox"]),
            faceplate-tracker:has(button[aria-label*="Inbox"]),
            faceplate-tracker:has(button[aria-label*="inbox"]),
            button[aria-label*="chat"],
            button[aria-label*="Chat"],
            button[aria-label*="inbox"],
            button[aria-label*="Inbox"] {
              display: none !important;
            }
          `;
        }

        let promotedCSS = '';
        if (rd.promoted) {
          promotedCSS = `
            a[href*="advertise"],
            a[href*="advertising"],
            a[href*="ads.reddit.com"],
            faceplate-tracker[noun="advertise"],
            faceplate-tracker[noun="advertising"],
            [noun="advertise"],
            [noun="advertising"] {
              display: none !important;
            }
          `;
        }

        let searchCSS = '';
        if (rd.search) {
          searchCSS = `
            reddit-search-large,
            shreddit-search-input,
            faceplate-search-input,
            [role="search"],
            input[placeholder*="Search"],
            input[placeholder*="Find anything"],
            input[name="q"],
            form[action*="/search"],
            faceplate-tracker[noun="search"],
            faceplate-tracker[noun="search_bar"] {
              display: none !important;
            }
          `;
        }

        const combinedShadowCSS = [commentCSS, chatDMsCSS, promotedCSS, searchCSS].filter(Boolean).join('\n');

        if (combinedShadowCSS) {
          shadowHosts.forEach(host => {
            if (host && host.shadowRoot) {
              let styleTag = host.shadowRoot.getElementById('focusshield-shadow-css');
              if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'focusshield-shadow-css';
                host.shadowRoot.appendChild(styleTag);
              }
              if (styleTag.textContent !== combinedShadowCSS) {
                styleTag.textContent = combinedShadowCSS;
              }
            }
          });
        } else {
          // Remove if disabled
          shadowHosts.forEach(host => {
            if (host && host.shadowRoot) {
              const styleTag = host.shadowRoot.getElementById('focusshield-shadow-css');
              if (styleTag) styleTag.remove();
            }
          });
        }

        if (rd.popularAll && (isPopular || isAll || isNews || isExplore)) {
          let label = 'reddit.com/r/popular';
          if (isAll) label = 'reddit.com/r/all';
          else if (isNews) label = 'reddit.com/news';
          else if (isExplore) label = 'reddit.com/explore';
          injectDOMBlockScreen(label);
          return;
        }
        if (rd.chatDMs && isChat) {
          injectDOMBlockScreen(isChatSubdomain ? 'chat.reddit.com' : 'reddit.com/chat');
          return;
        }
      };
      runRedditChecks();
      platformInterval = setInterval(runRedditChecks, 200);
    }

    // 5. TikTok checks (For You, Following, Live, Shop, Search, Upload redirection)
    if (hostname.includes('tiktok.com') && settings.tiktok && settings.tiktok.enabled !== false) {
      const tt = settings.tiktok;
      const runTiktokChecks = () => {
        const path = window.location.pathname.toLowerCase();
        
        if (tt.foryou && (path === '/' || path === '/foryou' || path === '/recommend' || path === '/explore') && !isSubfeatureBypassed('tiktok.com/foryou')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('tiktok.com/foryou')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (tt.following && path.startsWith('/following') && !isSubfeatureBypassed('tiktok.com/following')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('tiktok.com/following')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (tt.live && path.startsWith('/live') && !isSubfeatureBypassed('tiktok.com/live')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('tiktok.com/live')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (tt.shop && path.startsWith('/shop') && !isSubfeatureBypassed('tiktok.com/shop')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('tiktok.com/shop')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (tt.search && path.startsWith('/search') && !isSubfeatureBypassed('tiktok.com/search')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('tiktok.com/search')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
        if (tt.upload && path.startsWith('/upload') && !isSubfeatureBypassed('tiktok.com/upload')) {
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent('tiktok.com/upload')
            + '&type=subfeature'
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          window.location.href = blockedUrl;
          return;
        }
      };
      runTiktokChecks();
      platformInterval = setInterval(runTiktokChecks, 250);
    }
  }

  function getPlatform(hostname) {
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('facebook.com') || hostname.includes('messenger.com')) return 'facebook';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('reddit.com')) return 'reddit';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return null;
  }

  function generateCSS(settings) {
    if (!settings) return '';
    const selectors = [];
    const hostname = window.location.hostname;
    const platform = getPlatform(hostname);

    if (!settings || !settings.masterToggle) return '';

    if (platform === 'youtube') {
      const yt = settings.youtube;
      if (yt && yt.enabled !== false) {
        if (yt.sidebar) {
          selectors.push(
            '#secondary', 
            '#related', 
            'ytd-watch-next-secondary-results-renderer', 
            'ytd-compact-video-renderer'
          );
        }
        if (yt.comments) {
          selectors.push(
            '#comments', 
            'ytd-comments', 
            'ytd-item-section-renderer[section-identifier="comment-item-section"]'
          );
        }
        if (yt.feed) {
          selectors.push(
            'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer', 
            'ytd-browse[page-subtype="home"] #primary', 
            'ytd-browse[page-subtype="home"] #contents'
          );
        }
        if (yt.shorts) {
          selectors.push(
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer',
            'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
            'ytd-rich-section-renderer:has(a[href^="/shorts"])',
            'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer)',
            'ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)',
            'ytd-guide-entry-renderer:has(a[href*="shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[href*="shorts"])',
            'ytd-guide-entry-renderer:has(a[href="/shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[href="/shorts"])',
            'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-guide-entry-renderer[aria-label="Shorts"]',
            'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
            'a[href*="/shorts/"]',
            'a[href^="/shorts"]',
            'ytd-shorts',
            'ytd-reel-video-renderer',
            '#shorts-container'
          );
        }
        if (yt.autoplay) {
          selectors.push(
            '.ytp-autonav-toggle-button', 
            '.ytp-upnext', 
            '.ytp-upnext-autoplay-icon'
          );
        }
      }
    } 
    else if (platform === 'facebook') {
      const fb = settings.facebook;
      if (fb && fb.enabled !== false) {
        if (fb.feed) {
          selectors.push(
            '[role="feed"]', 
            '[data-pagelet="FeedUnit"]', 
            'div[id^="topnews_main_stream_"]', 
            'div:has(> [role="feed"])', 
            '[data-pagelet="GroupFeed"]',
            'html[data-fs-fb-home="true"] [role="main"]',
            'html[data-fs-fb-home="true"] [data-pagelet="GroupFeed"]'
          );
        }
        if (fb.stories) {
          selectors.push(
            '[aria-label="Stories"]', 
            '[data-pagelet="Stories"]', 
            'div[aria-label*="Stories"]'
          );
        }
        if (fb.notifications) {
          selectors.push(
            'a[href*="/notifications"]',
            '[aria-label*="Notifications"]',
            '[aria-label*="notifications"]'
          );
        }
        if (fb.reels) {
          selectors.push(
            '[data-pagelet="Reels"]', 
            '[aria-label="Reels"]', 
            '[aria-label="reel"]', 
            'div[aria-label*="Reels"]', 
            'div[aria-label*="reels"]', 
            'a[href*="/reels/"]', 
            'a[href^="/reels/"]', 
            'div:has(> [aria-label="Reels"])'
          );
        }
        if (fb.messenger) {
          selectors.push(
            '[data-pagelet="ChatTab"]',
            '[data-pagelet="chat_sidebar"]',
            'div[role="grid"]:has([data-testid="chat_sidebar"])',
            'a[href*="/messages/"]',
            '[aria-label="Messenger"]',
            '[aria-label="Chats"]',
            'iframe[src*="messenger"]'
          );
        }
        if (fb.comments) {
          selectors.push(
            'div[data-pagelet="CommentFeed"]',
            'div[data-pagelet="CommentList"]',
            '.comments-list',
            'div[aria-label="Comment"]',
            'div[aria-label*="comment"]',
            'form[aria-label="Write a comment"]',
            'form[aria-label*="comment"]',
            'div:has(> form[aria-label*="comment"])'
          );
        }
        if (fb.friends) {
          selectors.push(
            'a[href*="/friends/"]',
            'a[href$="/friends"]',
            'a[href*="/friends?"]',
            'a[href*="/friends/requests"]',
            'a[href*="/friends/suggestions"]',
            '[data-pagelet="PyMK"]',
            'div[aria-label*="People You May Know"]',
            'div[aria-label*="People you may know"]'
          );
        }
        if (fb.groups) {
          selectors.push(
            'a[href*="/groups/"]',
            'a[href$="/groups"]',
            'a[href*="/groups?"]'
          );
        }
        if (fb.pages) {
          selectors.push(
            'a[href*="/pages/"]',
            'a[href$="/pages"]',
            'a[href*="/pages?"]'
          );
        }
      }
    } 
    else if (platform === 'instagram') {
      const ig = settings.instagram;
      if (ig && ig.enabled !== false) {
        if (ig.feed) {
          selectors.push(
            'html[data-fs-ig-home="true"] main section > div:first-child',
            'html[data-fs-ig-home="true"] article'
          );
        }
        if (ig.reels) {
          selectors.push(
            'a[href^="/reels"]',
            'a[href^="/reel"]',
            'a[href*="/reels/"]',
            'a[href*="/reel/"]',
            'a[aria-label*="Reels"]',
            'a[aria-label*="reels"]',
            'a:has([aria-label*="Reels"])',
            'a:has([aria-label*="reels"])',
            'div[role="button"]:has(svg[aria-label*="Reels"])',
            'div[role="button"]:has(svg[aria-label*="reels"])',
            'div[role="button"]:has([aria-label*="Reels"])',
            'div[role="button"]:has([aria-label*="reels"])',
            'svg[aria-label*="Reels"]',
            'svg[aria-label*="reels"]'
          );
        }
        if (ig.explore) {
          selectors.push(
            'a[href^="/explore"]',
            'a[href*="/explore/"]',
            'a[aria-label*="Explore"]',
            'a[aria-label*="explore"]',
            'a:has([aria-label*="Explore"])',
            'a:has([aria-label*="explore"])',
            'div[role="button"]:has(svg[aria-label*="Explore"])',
            'div[role="button"]:has(svg[aria-label*="explore"])',
            'div[role="button"]:has([aria-label*="Explore"])',
            'div[role="button"]:has([aria-label*="explore"])',
            'svg[aria-label*="Explore"]',
            'svg[aria-label*="explore"]'
          );
        }
        if (ig.stories) {
          selectors.push(
            'div:has(> [aria-label*="Stories"])',
            'div:has(> [aria-label*="stories"])',
            'main [role="menu"]',
            'div[role="menu"]:has([aria-label*="Stories"])',
            'div[role="menu"]:has([aria-label*="stories"])',
            '[aria-label*="Stories"]',
            '[aria-label*="stories"]',
            'header [role="menuitem"]:first-child',
            'ul:has(a[href*="/stories/"])',
            'div:has(> ul:has(a[href*="/stories/"]))',
            'a[href*="/stories/"]'
          );
        }

        if (ig.shopping) {
          selectors.push(
            'a[href="/shop/"]',
            'a[href*="/shop"]',
            'a[href*="/shopping"]',
            'a[aria-label*="Shop"]',
            'a:has([aria-label*="Shop"])',
            'a:has([aria-label*="shop"])',
            'div[role="button"]:has(svg[aria-label*="Shop"])',
            'div[role="button"]:has([aria-label*="Shop"])',
            'svg[aria-label*="Shop"]'
          );
        }
        if (ig.messages) {
          selectors.push(
            'a[href*="/direct"]',
            'a[href*="direct"]',
            'a[aria-label*="Direct"]',
            'a[aria-label*="Messenger"]',
            'a[aria-label*="Messages"]',
            'a:has([aria-label*="Messenger"])',
            'a:has([aria-label*="Direct"])',
            'a:has([aria-label*="Messages"])',
            'div[role="button"]:has(svg[aria-label*="Messenger"])',
            'div[role="button"]:has(svg[aria-label*="Direct"])',
            'div[role="button"]:has(svg[aria-label*="Messages"])',
            'div[role="button"]:has([aria-label*="Messenger"])',
            'div[role="button"]:has([aria-label*="Direct"])',
            'div[role="button"]:has([aria-label*="Messages"])',
            'svg[aria-label*="Messenger"]',
            'svg[aria-label*="Direct"]',
            'svg[aria-label*="Messages"]'
          );
        }
        if (ig.comments) {
          selectors.push(
            'a:has(svg[aria-label*="Comment"])',
            'a:has(svg[aria-label*="comment"])',
            'button:has(svg[aria-label*="Comment"])',
            'button:has(svg[aria-label*="comment"])',
            'svg[aria-label*="Comment"]',
            'svg[aria-label*="comment"]',
            'form:has(textarea[placeholder*="comment"])',
            'form:has(textarea[placeholder*="Comment"])',
            'div[role="dialog"] ul > li:not(:first-child)',
            'main ul > li:not(:first-child)'
          );
        }
        if (ig.notifications) {
          selectors.push(
            'a[href*="notifications"]',
            'a[href*="/notifications"]',
            'a:has(svg[aria-label*="Activity"])',
            'a:has(svg[aria-label*="Notifications"])',
            'a:has(svg[aria-label*="Heart"])',
            'a[aria-label*="Notifications"]',
            'a[aria-label*="Activity"]',
            'a:has([aria-label*="Notifications"])',
            'a:has([aria-label*="Activity"])',
            'a:has([aria-label*="Heart"])',
            'div[role="button"]:has(svg[aria-label*="Notifications"])',
            'div[role="button"]:has(svg[aria-label*="Activity"])',
            'div[role="button"]:has(svg[aria-label*="Heart"])',
            'div[role="button"]:has([aria-label*="Notifications"])',
            'div[role="button"]:has([aria-label*="Activity"])',
            'div[role="button"]:has([aria-label*="Heart"])',
            'svg[aria-label*="Notifications"]',
            'svg[aria-label*="Activity"]',
            'svg[aria-label*="Heart"]'
          );
        }
      }
    } 
    else if (platform === 'reddit') {
      const rd = settings.reddit;
      if (rd && rd.enabled !== false) {
        if (rd.promoted) {
          selectors.push(
            'shreddit-ad-post',
            '[data-ad-id]',
            '.promotedlink',
            'div.promoted',
            '[data-promoted="true"]',
            '[promotedlink]'
          );
        }
        if (rd.communities) {
          selectors.push(
            '#communities-list',
            '#subscribed-details-feed-list',
            '#recent-details-feed-list',
            'shreddit-sidebar #subscribed-details-feed-list',
            'shreddit-sidebar #recent-details-feed-list',
            'reddit-recent-pages',
            'faceplate-expandable-section-helper:has(> details > summary > [noun="recent_communities_menu"])',
            'faceplate-expandable-section-helper:has(> details > summary > [noun="communities_menu"])',
            'faceplate-expandable-section-helper:has(#recent_communities_section)',
            'faceplate-expandable-section-helper:has(#communities_section)',
            'faceplate-expandable-section-helper:has(details[id="communities_section"])',
            'faceplate-expandable-section-helper:has(details[id="recent_communities_section"])',
            '#recent-communities-section'
          );
        }
        if (rd.search) {
          selectors.push(
            'reddit-search-large',
            'shreddit-search-input',
            'faceplate-search-input',
            '[role="search"]',
            'input[placeholder*="Search"]',
            'input[placeholder*="Find anything"]',
            'input[name="q"]',
            'form[action*="/search"]',
            'faceplate-tracker[noun="search"]',
            'faceplate-tracker[noun="search_bar"]'
          );
        }
        if (rd.premium) {
          selectors.push(
            'a[href="/premium"]',
            'a[href*="/premium"]',
            '#reddit-premium-nav-button',
            '[class*="premium"]',
            '#premium-sidebar-card',
            '.premium-banner',
            '.premium-banner-outer',
            'shreddit-sidebar-card:has(a[href*="premium"])',
            'shreddit-sidebar-card:has(a[href*="premium_sign_up"])',
            'shreddit-sidebar-card:has(a[href="/premium"])',
            'div[id*="premium-card"]'
          );
        }
        if (rd.trending) {
          selectors.push(
            '[class*="trending"]',
            '#search-results-trending',
            '[aria-label="Trending search queries"]',
            'faceplate-tracker[data-click-id="trend"]',
            '[noun="trending_searches"]',
            '[noun="trending_searches_list"]',
            'div[id*="trending-searches"]',
            'shreddit-sidebar-card:has(faceplate-tracker[data-click-id="trend"])',
            'shreddit-sidebar-card:has(a[href*="trend"])',
            'shreddit-sidebar-card:has(a[href*="trending"])'
          );
        }
        if (rd.popularAll) {
          selectors.push(
            'a[href="/r/popular"]',
            'a[href="/r/all"]',
            'a[href*="/r/popular"]',
            'a[href*="/r/all"]',
            'a[href^="/r/popular/"]',
            'a[href^="/r/all/"]',
            'a[href^="/r/popular?"]',
            'a[href^="/r/all?"]',
            'faceplate-tracker:has(a[href="/r/popular"])',
            'faceplate-tracker:has(a[href="/r/all"])',
            // Hide the feed on Popular page
            'html[data-fs-rd-popular="true"] shreddit-feed',
            'html[data-fs-rd-popular="true"] shreddit-post',
            'html[data-fs-rd-popular="true"] main',
            'html[data-fs-rd-popular="true"] #main-content',
            // Hide the feed on All page
            'html[data-fs-rd-all="true"] shreddit-feed',
            'html[data-fs-rd-all="true"] shreddit-post',
            'html[data-fs-rd-all="true"] main',
            'html[data-fs-rd-all="true"] #main-content',
            // Hide the feed on Home page
            'html[data-fs-rd-home="true"] shreddit-feed',
            'html[data-fs-rd-home="true"] shreddit-post',
            'html[data-fs-rd-home="true"] main',
            'html[data-fs-rd-home="true"] #main-content'
          );
        }
        if (rd.commentsSection) {
          selectors.push(
            'shreddit-comment-tree',
            '#comment-tree',
            '.commentarea',
            'shreddit-comment',
            '#comments-area',
            'shreddit-comments',
            '#comments-container',
            'div[data-testid="post-comments"]',
            'div:has(> shreddit-comment-tree)',
            'div:has(> shreddit-comments)',
            '[noun="comments"]',
            'shreddit-comment-tree-header',
            'shreddit-comment-tree-ad',
            'shreddit-comments-page-ad',
            'div[data-testid="comment-list"]',
            'shreddit-comment-limit-message',
            'shreddit-post-action-row a[href*="/comments/"]',
            'shreddit-post-action-row [href*="/comments/"]',
            'a[href*="/comments/"]',
            'faceplate-icon[name="comment"]',
            'faceplate-icon[name="comment-outline"]',
            'faceplate-icon[name*="comment"]',
            'a:has(faceplate-icon[name*="comment"])',
            'button:has(faceplate-icon[name*="comment"])',
            'shreddit-post-action-row faceplate-tracker:has(a[href*="/comments/"])',
            'shreddit-post-action-row faceplate-tracker:has([href*="/comments/"])',
            'faceplate-tracker:has(a[href*="/comments/"])',
            'faceplate-tracker:has([href*="/comments/"])',
            '[data-testid="post-comment-button"]',
            '[aria-label*="comment"]',
            '[aria-label*="Comment"]',
            '[data-testid*="comment"]',
            // Feed Post Comment Count/Icon targets
            'shreddit-post a[href*="/comments/"]',
            'shreddit-post [href*="/comments/"]',
            'shreddit-post faceplate-tracker:has(a[href*="/comments/"])',
            'shreddit-post faceplate-tracker:has([href*="/comments/"])',
            'shreddit-post faceplate-icon[name="comment"]',
            'shreddit-post faceplate-icon[name="comment-outline"]',
            'shreddit-post faceplate-icon[name*="comment"]',
            'shreddit-post [data-testid*="comment"]',
            'shreddit-post [aria-label*="comment"]',
            'shreddit-post [aria-label*="Comment"]'
          );
        }
        if (rd.chatDMs) {
          selectors.push(
            'a[href*="chat"]',
            '#chat-button',
            '[aria-label="Chat"]',
            '[data-testid="chat-button"]',
            'iframe[src*="chat.reddit.com"]',
            'a[href*="/message/inbox"]',
            'a[href*="/message/compose"]',
            'a[href*="/message/sent"]',
            'a[href*="/message/"]',
            'a[href*="/messages"]',
            'a[href*="message"]',
            '[aria-label*="Inbox"]',
            '[aria-label*="inbox"]',
            '[data-testid="inbox-button"]',
            '[aria-label*="Chat"]',
            '[aria-label*="chat"]',
            'html[data-fs-rd-chat="true"] shreddit-app',
            'html[data-fs-rd-chat="true"] main',
            'html[data-fs-rd-chat="true"] #main-content',
            'faceplate-icon[name="chat"]',
            'faceplate-icon[name="chat-outline"]',
            'faceplate-icon[name*="chat"]',
            'faceplate-tracker:has(a[href*="chat"])',
            'faceplate-tracker:has(button[aria-label*="chat"])',
            'faceplate-tracker:has(button[aria-label*="Chat"])',
            'faceplate-tracker:has(a[href*="message"])',
            'faceplate-tracker:has(a[href*="inbox"])',
            'faceplate-tracker:has(a[href*="/message/inbox"])',
            'faceplate-tracker:has(button[aria-label*="Inbox"])',
            'faceplate-tracker:has(button[aria-label*="inbox"])',
            'a[href*="reddit.com/chat"]',
            // Header specific targets
            'shreddit-header a[href*="chat"]',
            'shreddit-header a[href*="message"]',
            'shreddit-header button[aria-label*="chat"]',
            'shreddit-header button[aria-label*="Chat"]',
            'shreddit-header button[aria-label*="inbox"]',
            'shreddit-header button[aria-label*="Inbox"]',
            'shreddit-header faceplate-tracker:has(a[href*="chat"])',
            'shreddit-header faceplate-tracker:has(a[href*="message"])',
            'shreddit-header faceplate-tracker:has(button[aria-label*="chat"])',
            'shreddit-header faceplate-tracker:has(button[aria-label*="Chat"])',
            'shreddit-header faceplate-tracker:has(button[aria-label*="inbox"])',
            'shreddit-header faceplate-tracker:has(button[aria-label*="Inbox"])',
            'a[href^="https://www.reddit.com/chat"]',
            'a[href^="https://chat.reddit.com"]',
            'a[href^="https://www.reddit.com/message"]',
            'button[aria-label*="chat"]',
            'button[aria-label*="Chat"]',
            'button[aria-label*="inbox"]',
            'button[aria-label*="Inbox"]'
          );
        }
      }
    }
    else if (platform === 'tiktok') {
      const tt = settings.tiktok;
      if (tt && tt.enabled !== false) {
        if (tt.foryou) {
          selectors.push(
            '[data-e2e="recommend-list-item-container"]',
            'div:has(> [data-e2e="recommend-list-item-container"])',
            'a[href*="/foryou"]',
            'a[href*="foryou"]',
            '[class*="DivVideoFeedV2"]',
            '[class*="RecommendList"]'
          );
        }
        if (tt.following) {
          selectors.push(
            '[data-e2e="following-list-item-container"]',
            '[data-e2e="following-nav"]',
            'a[href*="/following"]',
            'a[href*="following"]',
            '[class*="DivFollowingFeed"]'
          );
        }
        if (tt.suggested) {
          selectors.push(
            '[data-e2e="suggested-accounts"]',
            '[data-e2e="sidebar-suggested-list"]',
            '[class*="UserList"]',
            '[class*="SideBarUser"]',
            'div:has(> [data-e2e="suggested-accounts"])'
          );
        }
        if (tt.live) {
          selectors.push(
            '[data-e2e="live-panel"]',
            '[data-e2e="live-side-nav"]',
            'a[href*="/live"]',
            'a[href*="live"]',
            '[class*="LiveAnchor"]'
          );
        }
        if (tt.shop) {
          selectors.push(
            '[data-e2e="shop-tab"]',
            'a[href*="/shop"]',
            'a[href*="shop"]',
            '[class*="ShopEntry"]'
          );
        }
        if (tt.badges) {
          selectors.push(
            '[data-e2e="notification-badge"]',
            '[data-e2e="badge-count"]',
            '[class*="BadgeCount"]'
          );
        }
        if (tt.comments) {
          selectors.push(
            '[data-e2e="comment-icon"]',
            '[data-e2e*="comment-icon"]',
            '[class*="comment"]',
            '[class*="Comment"]',
            '[aria-label*="comment"]',
            '[aria-label*="Comment"]',
            '[data-e2e="comment-container"]',
            '[class*="CommentContainer"]',
            '[class*="CommentList"]',
            '[data-e2e="comment-list"]',
            'div:has(> [data-e2e="comment-container"])'
          );
        }
        if (tt.search) {
          selectors.push(
            '[data-e2e="search-input"]',
            '[data-e2e="search-box"]',
            'input[placeholder*="Search"]',
            'input[placeholder*="search"]',
            '[aria-label="Search"]',
            '[aria-label*="search"]',
            'form[action*="/search"]',
            'div:has(> [data-e2e="search-input"])'
          );
        }
        if (tt.upload) {
          selectors.push(
            '[data-e2e="upload-icon"]',
            '[data-e2e="upload-link"]',
            '[data-e2e="upload-button"]',
            'a[href*="/upload"]',
            'a[href*="upload"]',
            'a:has([data-e2e="upload-icon"])'
          );
        }
      }
    } 
    else if (platform === 'twitter') {
      const tw = settings.twitter;
      if (tw && tw.enabled !== false) {
        if (tw.trending) {
          selectors.push(
            '[aria-label="Timeline: Trending now"]',
            '[aria-label="Timeline: What’s happening"]',
            '[aria-label="Timeline: What\'s happening"]',
            '[data-testid="trend"]'
          );
        }
        if (tw.whotofollow) selectors.push('[aria-label="Who to follow"]', '[data-testid="UserCell"]');
        if (tw.promoted) selectors.push('[data-testid="placementTracking"]', '[data-testid="promotedTweet"]');
        if (tw.spaces) selectors.push('[aria-label="Spaces"]');
        if (tw.messages) {
          selectors.push(
            '[data-testid="DMDrawer"]',
            'a[href="/messages"]',
            'a[href*="/messages"]',
            '[data-testid="AppTabBar_DirectMessage_Link"]',
            'a[href="/chat"]',
            'a[href*="/chat"]',
            '[data-testid="dm"]',
            '[data-testid="DMButton"]',
            '[aria-label="Direct messages"]',
            '[aria-label="Direct Messages"]',
            '[aria-label="Messages"]',
            '[data-testid="sendDMFromProfile"]',
            '[data-testid="profile-action-message"]',
            '[aria-label="Message"]',
            'button[aria-label="Message"]',
            'a[aria-label="Message"]',
            'button:has([data-testid="DMDrawer"])',
            'div:has(> [data-testid="DMDrawer"])',
            '[data-testid="hoverCard"] [data-testid="sendDMFromProfile"]',
            '[data-testid="hoverCard"] [aria-label="Message"]',
            '[data-testid="hoverCard"] [data-testid="dm"]'
          );
        }
        if (tw.explore || tw.feed) {
          selectors.push(
            'a[href="/explore"]',
            '[data-testid="AppTabBar_Explore_Link"]'
          );
        }
        if (tw.communities) {
          selectors.push(
            'a[href*="/communities"]',
            '[data-testid="AppTabBar_Communities_Link"]'
          );
        }
        if (tw.notifications) {
          selectors.push(
            'a[href="/notifications"]',
            '[data-testid="AppTabBar_Notifications_Link"]'
          );
        }
        if (tw.premium) {
          selectors.push(
            'a[href="/settings/premium"]',
            '[data-testid="AppTabBar_Premium_Link"]',
            'a[href="/i/premium_sign_up"]',
            '[aria-label="Subscribe to Premium"]',
            'aside[role="complementary"] a[href="/settings/premium"]',
            'svg[data-testid="icon-verified"]',
            'svg[aria-label="Verified account"]',
            'span:has(> svg[data-testid="icon-verified"])'
          );
        }
        if (tw.feed) {
          selectors.push(
            'html[data-fs-tw-home="true"] [data-testid="primaryColumn"] section[role="region"]',
            'html[data-fs-tw-home="true"] [data-testid="primaryColumn"] div[style*="min-height"]'
          );
        }
      }
    }

    if (selectors.length === 0) return '';
    return selectors.map(s => `${s} { display: none !important; }`).join('\n');
  }

  function injectCSS(css) {
    if (!css || css.trim() === '') return;
    
    const existing = document.getElementById('focusshield-css');
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = 'focusshield-css';
    style.textContent = css;
    
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        (document.head || document.documentElement).appendChild(style);
      });
    }
  }

  function removeCSS() {
    const style = document.getElementById('focusshield-css');
    if (style) style.remove();
  }

  function isScheduleActive(sched) {
    if (!sched.enabled) return false;
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (0=Sunday)
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
      if (matchDomain) {
        return category;
      }

      const matchKeyword = db.keywords.some(kw => cleanPath.includes(kw));
      if (matchKeyword) {
        return category;
      }
    }

    return null;
  }

  function recordCategoryBlockInStats(categoryName, domain) {
    const nowTime = Date.now();
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

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

      stats.totalSessionsCompleted = (stats.totalSessionsCompleted || 0) + 1;
      
      const minsSaved = 5;
      stats.timeSavedMinutes = (stats.timeSavedMinutes || 0) + minsSaved;

      const chartKey = `[${categoryName}]`;
      if (!stats.siteBlockCounts) stats.siteBlockCounts = {};
      stats.siteBlockCounts[chartKey] = (stats.siteBlockCounts[chartKey] || 0) + 1;

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
      log.sessions = (log.sessions || 0) + 1;
      log.minutes = (log.minutes || 0) + minsSaved;
      if (!log.siteCounts) log.siteCounts = {};
      log.siteCounts[chartKey] = (log.siteCounts[chartKey] || 0) + 1;

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

  function applyBlocking(settings) {
    // ── HARD BLOCK CHECK (highest priority — runs before masterToggle) ──
    const hardBlockedSites = (settings && settings.hardBlockedSites) || [];
    const currentHostname  = window.location.hostname.toLowerCase().replace(/^www\./, '');

    const hardEntry = hardBlockedSites.find(s => {
      const d = s.domain.toLowerCase().replace(/^www\./, '');
      return currentHostname === d || currentHostname.endsWith('.' + d);
    });

    if (hardEntry) {
      if (Date.now() < hardEntry.expiresAt) {
        // Active hard block — redirect to hard-blocked.html
        const hardUrl = chrome.runtime.getURL('hard-blocked.html')
          + '?site='        + encodeURIComponent(window.location.hostname)
          + '&expiresAt='   + encodeURIComponent(hardEntry.expiresAt)
          + '&originalUrl=' + encodeURIComponent(window.location.href);
        window.location.href = hardUrl;
        return;
      } else {
        // Expired — silently auto-remove from storage
        chrome.storage.local.get('hardBlockedSites', (r) => {
          const updated = (r.hardBlockedSites || []).filter(
            s => s.domain.toLowerCase().replace(/^www\./, '') !== hardEntry.domain.toLowerCase().replace(/^www\./, '')
          );
          chrome.storage.local.set({ hardBlockedSites: updated });
        });
      }
    }
    // ── END HARD BLOCK CHECK ────────────────────────────────────────────

    // ── SCHEDULE BLOCK CHECK ──
    const schedules = (settings && settings.schedules) || [];
    const activeSchedule = schedules.find(sched => {
      if (!sched.enabled) return false;
      const d = sched.domain.toLowerCase().replace(/^www\./, '');
      const matches = currentHostname === d || currentHostname.endsWith('.' + d);
      return matches && isScheduleActive(sched);
    });

    if (activeSchedule) {
      const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
        + '?site=' + encodeURIComponent(window.location.hostname)
        + '&type=schedule'
        + '&startTime=' + encodeURIComponent(activeSchedule.startTime)
        + '&endTime=' + encodeURIComponent(activeSchedule.endTime)
        + '&days=' + encodeURIComponent(activeSchedule.days.join(','))
        + '&returnUrl=' + encodeURIComponent(document.referrer || '')
        + '&originalUrl=' + encodeURIComponent(window.location.href);
      window.location.href = blockedUrl;
      return;
    }
    // ── END SCHEDULE BLOCK CHECK ──

    // ── CATEGORY FILTER BLOCK CHECK ──
    if (settings && settings.masterToggle !== false) {
      const path = window.location.pathname;
      const matchedCategory = getMatchingCategory(window.location.hostname, path, settings);
      
      if (matchedCategory) {
        const bypasses = settings.filterBypasses || {};
        const bypassExpiry = bypasses[currentHostname] || 0;
        
        if (Date.now() >= bypassExpiry) {
          const displayNameMap = {
            Adult: 'Adult & NSFW',
            Gaming: 'Gaming & Esports',
            Shopping: 'Shopping & E-Commerce',
            Gambling: 'Gambling & Betting',
            Streaming: 'Streaming & Entertainment'
          };
          const categoryName = displayNameMap[matchedCategory] || matchedCategory;
          
          const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
            + '?site=' + encodeURIComponent(categoryName)
            + '&type=filter'
            + '&domain=' + encodeURIComponent(currentHostname)
            + '&returnUrl=' + encodeURIComponent(document.referrer || '')
            + '&originalUrl=' + encodeURIComponent(window.location.href);
          
          recordCategoryBlockInStats(categoryName, currentHostname);
          window.location.href = blockedUrl;
          return;
        }
      }
    }
    // ── END CATEGORY FILTER BLOCK CHECK ──

    runPlatformBackgroundChecks(settings);

    if (!settings || !settings.masterToggle) {
      removeCSS();
      return;
    }

    const hostname = window.location.hostname;
    const platform = getPlatform(hostname);

    if (platform) {
      if (settings[platform] && settings[platform].blockFullSite === true) {
        const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
          + '?site=' + encodeURIComponent(window.location.hostname)
          + '&returnUrl=' + encodeURIComponent(document.referrer || '')
          + '&originalUrl=' + encodeURIComponent(window.location.href);
        window.location.href = blockedUrl;
        return;
      }

      const isEnabled = settings[platform] && settings[platform].enabled !== false;
      if (isEnabled) {
        const bypasses = settings.filterBypasses || {};
        const isBypassed = (key) => bypasses[key] && Date.now() < bypasses[key];
        // Direct page load check for Shorts on YouTube
        if (platform === 'youtube' && settings.youtube && settings.youtube.shorts && !isBypassed('youtube.com/shorts')) {
          if (window.location.pathname.startsWith('/shorts')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=youtube.com/shorts'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
        }

        // Direct page load check for Reels, Messenger, Friends, Groups, Pages on Facebook
        if (platform === 'facebook' && settings.facebook) {
          const fb = settings.facebook;
          if (fb.reels && (window.location.pathname.startsWith('/reels') || window.location.pathname.startsWith('/reel')) && !isBypassed('facebook.com/reels')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/reels'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (fb.messenger && window.location.pathname.startsWith('/messages') && !isBypassed('facebook.com/messages')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/messages'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (fb.messenger && hostname.includes('messenger.com') && !isBypassed('messenger.com')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=messenger.com'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (fb.friends && (window.location.pathname.startsWith('/friends') || window.location.pathname.startsWith('/friends/')) && !isBypassed('facebook.com/friends')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/friends'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (fb.groups && (window.location.pathname.startsWith('/groups') || window.location.pathname.startsWith('/groups/')) && !isBypassed('facebook.com/groups')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/groups'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (fb.pages && (window.location.pathname.startsWith('/pages') || window.location.pathname.startsWith('/pages/')) && !isBypassed('facebook.com/pages')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=facebook.com/pages'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
        }

        // Direct page load check for Twitter/X sections (coupled explore/feed)
        if (platform === 'twitter' && settings.twitter) {
          const tw = settings.twitter;
          if (tw.messages && (window.location.pathname.startsWith('/messages') || window.location.pathname.startsWith('/chat')) && !isBypassed('x.com/messages')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=x.com/messages'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          const isExploreOrSearch = window.location.pathname.startsWith('/explore') || 
                                    window.location.pathname.startsWith('/search') || 
                                    window.location.pathname.startsWith('/trends') || 
                                    window.location.pathname.includes('/trends') || 
                                    window.location.pathname.startsWith('/i/trends');
          if ((tw.explore || tw.feed) && isExploreOrSearch && !isBypassed('x.com/explore')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=x.com/explore'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
        }

        // Direct page load check for Instagram sections
        if (platform === 'instagram' && settings.instagram) {
          const ig = settings.instagram;
          const path = window.location.pathname.toLowerCase();
          const isHome = path === '/' || path === '/home';
          if (ig.feed && isHome) {
            document.documentElement.setAttribute('data-fs-ig-home', 'true');
          }
          if (ig.reels && (path.startsWith('/reels') || path.startsWith('/reel')) && !isBypassed('instagram.com/reels')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/reels'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (ig.explore && path.startsWith('/explore') && !isBypassed('instagram.com/explore')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/explore'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (ig.shopping && (path.startsWith('/shop') || path.startsWith('/shopping')) && !isBypassed('instagram.com/shop')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/shop'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (ig.messages && path.startsWith('/direct') && !isBypassed('instagram.com/direct')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/direct'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (ig.stories && path.startsWith('/stories') && !isBypassed('instagram.com/stories')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=instagram.com/stories'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
        }

        // Direct page load check for Reddit sections
        if (platform === 'reddit' && settings.reddit) {
          const rd = settings.reddit;
          const cleanPath = '/' + window.location.pathname.toLowerCase().split('/').filter(Boolean).join('/');
          const isPopular = cleanPath === '/r/popular' || cleanPath.startsWith('/r/popular/');
          const isAll = cleanPath === '/r/all' || cleanPath.startsWith('/r/all/');
          const isHome = cleanPath === '/' || cleanPath === '/best' || cleanPath === '/hot' || cleanPath === '/new' || cleanPath === '/top' || cleanPath === '/rising';
          const isNews = cleanPath === '/news' || cleanPath.startsWith('/news/');
          const isExplore = cleanPath === '/explore' || cleanPath.startsWith('/explore/');
          const isChatSubdomain = hostname === 'chat.reddit.com' || hostname.endsWith('.chat.reddit.com');
          const isChatPath = cleanPath === '/chat' || cleanPath.startsWith('/chat/') || cleanPath === '/message' || cleanPath.startsWith('/message/');
          const isChat = isChatSubdomain || isChatPath;

          if (rd.popularAll && isPopular) {
            document.documentElement.setAttribute('data-fs-rd-popular', 'true');
          }
          if (rd.popularAll && isAll) {
            document.documentElement.setAttribute('data-fs-rd-all', 'true');
          }
          if (rd.popularAll && isHome) {
            document.documentElement.setAttribute('data-fs-rd-home', 'true');
          }
          if (rd.chatDMs && isChat) {
            document.documentElement.setAttribute('data-fs-rd-chat', 'true');
          }

          if (rd.popularAll && (isPopular || isAll || isNews || isExplore) && !isBypassed('reddit.com/r/popular') && !isBypassed('reddit.com/r/all') && !isBypassed('reddit.com/news') && !isBypassed('reddit.com/explore')) {
            let label = 'reddit.com/r/popular';
            if (isAll) label = 'reddit.com/r/all';
            else if (isNews) label = 'reddit.com/news';
            else if (isExplore) label = 'reddit.com/explore';
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=' + encodeURIComponent(label)
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (rd.chatDMs && isChat) {
            injectDOMBlockScreen(isChatSubdomain ? 'chat.reddit.com' : 'reddit.com/chat');
            return;
          }
        }

        // Direct page load check for TikTok sections
        if (platform === 'tiktok' && settings.tiktok) {
          const tt = settings.tiktok;
          const path = window.location.pathname.toLowerCase();
          
          if (tt.foryou && (path === '/' || path === '/foryou' || path === '/recommend' || path === '/explore') && !isBypassed('tiktok.com/foryou')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/foryou'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (tt.following && path.startsWith('/following') && !isBypassed('tiktok.com/following')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/following'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (tt.live && path.startsWith('/live') && !isBypassed('tiktok.com/live')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/live'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (tt.shop && path.startsWith('/shop') && !isBypassed('tiktok.com/shop')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/shop'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (tt.search && path.startsWith('/search') && !isBypassed('tiktok.com/search')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/search'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
          if (tt.upload && path.startsWith('/upload') && !isBypassed('tiktok.com/upload')) {
            const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
              + '?site=tiktok.com/upload'
              + '&type=subfeature'
              + '&returnUrl=' + encodeURIComponent(document.referrer || '')
              + '&originalUrl=' + encodeURIComponent(window.location.href);
            window.location.href = blockedUrl;
            return;
          }
        }

        const css = generateCSS(settings);
        injectCSS(css);
      } else {
        removeCSS();
      }
    } else {
      // Check custom sites list
      const targetHost = hostname.replace(/^www\./, '').toLowerCase();
      const hardSites = settings.hardBlockedSites || [];
      const hardEntry = hardSites.find(s => {
        const d = s.domain.toLowerCase().replace(/^www\./, '');
        return targetHost === d || targetHost.endsWith('.' + d);
      });

      const isCustomSite = settings.customSites && settings.customSites.some(site => {
        if (site.enabled === false) return false;
        const domain = site.domain.toLowerCase().replace(/^www\./, '');
        return targetHost === domain || targetHost.endsWith('.' + domain);
      });

      if (isCustomSite && hardEntry && Date.now() < hardEntry.expiresAt) {
        // Redirect custom sites to hard-blocked.html page only when active hard block exists
        const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
          + '?site=' + encodeURIComponent(window.location.hostname)
          + '&expiresAt=' + encodeURIComponent(hardEntry.expiresAt)
          + '&returnUrl=' + encodeURIComponent(document.referrer || '')
          + '&originalUrl=' + encodeURIComponent(window.location.href);
        window.location.href = blockedUrl;
      }
    }
  }

  let currentSettings = null;

  function refreshCurrentSettings(rawSettings) {
    currentSettings = mergeWithDefaults(rawSettings);
    applyBlocking(currentSettings);
  }

  // ON PAGE LOAD: Get settings and apply immediately
  chrome.storage.local.get(null, (result) => {
    refreshCurrentSettings(result);
  });

  // STORAGE CHANGE LISTENER: Keep content script settings up to date
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      chrome.storage.local.get(null, (result) => {
        refreshCurrentSettings(result);
      });

      // Sync session changes back to the website if page is open (for name updates or signouts)
      if (changes.sessionUser) {
        const syncUrl = window.location.href.toLowerCase();
        if (syncUrl.includes('getfocusshield.site') || syncUrl.includes('localhost') || syncUrl.includes('127.0.0.1') || (window.location.protocol === 'file:' && syncUrl.includes('/website/'))) {
          try {
            const newUser = changes.sessionUser.newValue;
            if (newUser) {
              localStorage.setItem('focusshield_mock_session', JSON.stringify(newUser));
            } else {
              localStorage.removeItem('focusshield_mock_session');
            }
          } catch (e) {}
        }
      }
    }
  });

  // MESSAGE LISTENER: Listen for settings changes from popup
  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        refreshCurrentSettings(message.settings);
      }
      if (message.type === 'MASTER_OFF') {
        removeCSS();
        runPlatformBackgroundChecks(null);
      }
    }
  );

  // REAL-TIME SCHEDULE AUTO-REDIRECT: Checks every 2s if current time enters an active schedule
  setInterval(() => {
    if (!currentSettings || !currentSettings.schedules || currentSettings.schedules.length === 0) return;
    const currentHostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
    const activeSchedule = currentSettings.schedules.find(sched => {
      if (!sched.enabled) return false;
      const d = sched.domain.toLowerCase().replace(/^www\./, '');
      const matches = currentHostname === d || currentHostname.endsWith('.' + d);
      return matches && isScheduleActive(sched);
    });

    if (activeSchedule) {
      const blockedUrl = chrome.runtime.getURL('hard-blocked.html') 
        + '?site=' + encodeURIComponent(window.location.hostname)
        + '&type=schedule'
        + '&startTime=' + encodeURIComponent(activeSchedule.startTime)
        + '&endTime=' + encodeURIComponent(activeSchedule.endTime)
        + '&days=' + encodeURIComponent(activeSchedule.days.join(','))
        + '&returnUrl=' + encodeURIComponent(document.referrer || '')
        + '&originalUrl=' + encodeURIComponent(window.location.href);
      window.location.href = blockedUrl;
    }
  }, 2000);

  // CSS PERSISTENCE CHECKER: Verifies every 500ms that global blocking CSS is present & updated (handles SPA transitions and dynamic DOM cleanups)
  setInterval(() => {
    if (currentSettings && currentSettings.masterToggle) {
      const hostname = window.location.hostname;
      const platform = getPlatform(hostname);
      if (platform && currentSettings[platform] && currentSettings[platform].enabled !== false) {
        const css = generateCSS(currentSettings);
        if (css && css.trim() !== '') {
          const existing = document.getElementById('focusshield-css');
          if (!existing || existing.textContent !== css) {
            injectCSS(css);
          }
        }
      }
    }
  }, 500);

  // ── Sync Website Auth State to Chrome Extension ──
  const syncUrl = window.location.href.toLowerCase();
  if (syncUrl.includes('getfocusshield.site') || syncUrl.includes('localhost') || syncUrl.includes('127.0.0.1') || (window.location.protocol === 'file:' && syncUrl.includes('/website/'))) {
    let lastSyncedSessionStr = null;
    
    function syncSessionWithExtension() {
      try {
        const sessionStr = localStorage.getItem('focusshield_mock_session');
        if (sessionStr !== lastSyncedSessionStr) {
          lastSyncedSessionStr = sessionStr;
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            let token = session.accessToken || null;
            if (!token) {
              try {
                const rawSbToken = localStorage.getItem('sb-evmbcpinujaufvwcxaaa-auth-token');
                if (rawSbToken) {
                  const parsedSbToken = JSON.parse(rawSbToken);
                  token = parsedSbToken.access_token || null;
                }
              } catch (err) {}
            }
            chrome.runtime.sendMessage({
              type: 'SYNC_WEBSITE_SESSION',
              session: {
                uid: session.uid,
                email: session.email,
                fullName: session.fullName || '',
                isPremium: !!session.isPremium,
                accessToken: token
              }
            }, () => {
              if (chrome.runtime.lastError) { /* ignore mismatch runtime errors */ }
            });
          } else {
            chrome.runtime.sendMessage({ type: 'CLEAR_WEBSITE_SESSION' }, () => {
              if (chrome.runtime.lastError) { /* ignore mismatch runtime errors */ }
            });
          }
        }
      } catch (e) {
        // Silent catch for restricted iframe or storage permissions
      }
    }
    
    // Check on load, periodically, instantly on custom event, and on page unload
    syncSessionWithExtension();
    setInterval(syncSessionWithExtension, 1000);
    document.addEventListener('focusshield-session-updated', syncSessionWithExtension);
    window.addEventListener('beforeunload', syncSessionWithExtension);
  }

})();
