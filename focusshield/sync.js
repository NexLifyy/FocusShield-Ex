// Reuse global Supabase Client initialized in auth.js to avoid duplicate instances warnings
let syncSupabaseClient = typeof supabaseClient !== 'undefined' ? supabaseClient : null;

function getJwtStatus(token, expectedUid) {
  try {
    if (!token) return { valid: false, error: 'Session token missing. Please open or refresh the FocusShield account page to sync.' };
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Session token format is invalid.' };
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    
    if (!payload) return { valid: false, error: 'Failed to read token payload.' };
    
    const nowSecs = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSecs >= payload.exp) {
      return { valid: false, error: 'Session token has expired. Please refresh the FocusShield account page to sync.' };
    }
    
    if (expectedUid && payload.sub !== expectedUid) {
      return { valid: false, error: `User ID mismatch (expected ${expectedUid}, got ${payload.sub}). Please log out and log in again.` };
    }
    
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'Token verification failed: ' + e.message };
  }
}

const syncService = {
  // Sync local data to cloud database
  async backupSettings() {
    const user = await authService.getCurrentUser();
    if (!user) return { success: false, error: 'User not signed in.' };

    const jwtStatus = getJwtStatus(user.accessToken, user.uid);
    if (!jwtStatus.valid) {
      return { success: false, error: jwtStatus.error };
    }

    if (syncSupabaseClient) {
      const { error: sessionError } = await syncSupabaseClient.auth.setSession({
        access_token: user.accessToken,
        refresh_token: user.refreshToken || ''
      });
      if (sessionError) {
        return { success: false, error: 'Session authentication failed: ' + sessionError.message };
      }
      const { data: { user: authUser }, error: userError } = await syncSupabaseClient.auth.getUser();
      if (userError || !authUser) {
        return { success: false, error: 'Retrieving authenticated user failed: ' + (userError ? userError.message : 'User not found.') };
      }
      if (authUser.id !== user.uid) {
        return { success: false, error: `Authenticated user ID mismatch (expected ${user.uid}, got ${authUser.id}).` };
      }
    }

    return new Promise((resolve) => {
      // Gather local settings
      chrome.storage.local.get([
        'customSites',
        'hardBlockedSites',
        'schedules',
        'focusStats',
        'filterAdult',
        'filterGaming',
        'filterShopping',
        'filterGambling',
        'filterStreaming',
        'previousPlatformStates',
        'youtube',
        'facebook',
        'instagram',
        'reddit',
        'tiktok',
        'twitter'
      ], async (data) => {
        if (syncSupabaseClient) {
          // Live Supabase sync logic
          try {
            const { error } = await syncSupabaseClient
              .from('backups')
              .upsert({
                user_id: user.uid,
                custom_sites: {
                  list: data.customSites || [],
                  hardBlocked: data.hardBlockedSites || []
                },
                schedules: data.schedules || [],
                focus_stats: data.focusStats || {},
                filter_adult: !!data.filterAdult,
                filter_gaming: !!data.filterGaming,
                filter_shopping: !!data.filterShopping,
                filter_gambling: !!data.filterGambling,
                filter_streaming: !!data.filterStreaming,
                previous_platform_states: {
                  history: data.previousPlatformStates || {},
                  activePlatforms: {
                    youtube: data.youtube || {},
                    facebook: data.facebook || {},
                    instagram: data.instagram || {},
                    reddit: data.reddit || {},
                    tiktok: data.tiktok || {},
                    twitter: data.twitter || {}
                  }
                },
                updated_at: new Date().toISOString()
              });

            if (error) {
              resolve({ success: false, error: error.message });
            } else {
              resolve({ success: true });
            }
          } catch(e) {
            resolve({ success: false, error: e.message });
          }
        } else {
          // Simulated cloud backup
          console.log('[Sync] Backing up data to mock cloud...', data);
          setTimeout(() => {
            // Save mock database row in local storage (simulating server state)
            chrome.storage.local.set({ mockCloudBackupRow: data }, () => {
              resolve({ success: true });
            });
          }, 800);
        }
      });
    });
  },

  async restoreSettings() {
    const user = await authService.getCurrentUser();
    if (!user) return { success: false, error: 'User not signed in.' };

    const jwtStatus = getJwtStatus(user.accessToken, user.uid);
    if (!jwtStatus.valid) {
      return { success: false, error: jwtStatus.error };
    }

    if (syncSupabaseClient) {
      const { error: sessionError } = await syncSupabaseClient.auth.setSession({
        access_token: user.accessToken,
        refresh_token: user.refreshToken || ''
      });
      if (sessionError) {
        return { success: false, error: 'Session authentication failed: ' + sessionError.message };
      }
      const { data: { user: authUser }, error: userError } = await syncSupabaseClient.auth.getUser();
      if (userError || !authUser) {
        return { success: false, error: 'Retrieving authenticated user failed: ' + (userError ? userError.message : 'User not found.') };
      }
      if (authUser.id !== user.uid) {
        return { success: false, error: `Authenticated user ID mismatch (expected ${user.uid}, got ${authUser.id}).` };
      }
    }

    return new Promise((resolve) => {
      if (syncSupabaseClient) {
        // Live Supabase restore logic
        syncSupabaseClient
          .from('backups')
          .select('*')
          .eq('user_id', user.uid)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              resolve({ success: false, error: error.message });
            } else if (!data) {
              resolve({ success: false, error: 'No cloud backups found.' });
            } else {
              // Map columns back to storage keys
              const customSitesData = data.custom_sites;
              let customSites = [];
              let hardBlockedSites = [];
              if (customSitesData) {
                if (Array.isArray(customSitesData)) {
                  // Legacy array support
                  customSites = customSitesData;
                } else if (typeof customSitesData === 'object') {
                  customSites = customSitesData.list || [];
                  hardBlockedSites = customSitesData.hardBlocked || [];
                }
              }

              const prevStatesData = data.previous_platform_states;
              let previousPlatformStates = {};
              let youtube = {};
              let facebook = {};
              let instagram = {};
              let reddit = {};
              let tiktok = {};
              let twitter = {};

              if (prevStatesData) {
                if (prevStatesData.activePlatforms) {
                  // New packaged format
                  previousPlatformStates = prevStatesData.history || {};
                  youtube = prevStatesData.activePlatforms.youtube || {};
                  facebook = prevStatesData.activePlatforms.facebook || {};
                  instagram = prevStatesData.activePlatforms.instagram || {};
                  reddit = prevStatesData.activePlatforms.reddit || {};
                  tiktok = prevStatesData.activePlatforms.tiktok || {};
                  twitter = prevStatesData.activePlatforms.twitter || {};
                } else {
                  // Legacy format
                  previousPlatformStates = prevStatesData;
                }
              }

              const restoreData = {
                customSites: customSites,
                hardBlockedSites: hardBlockedSites,
                schedules: data.schedules,
                focusStats: data.focus_stats,
                filterAdult: data.filter_adult,
                filterGaming: data.filter_gaming,
                filterShopping: data.filter_shopping,
                filterGambling: data.filter_gambling,
                filterStreaming: data.filter_streaming,
                previousPlatformStates: previousPlatformStates
              };

              if (Object.keys(youtube).length > 0) restoreData.youtube = youtube;
              if (Object.keys(facebook).length > 0) restoreData.facebook = facebook;
              if (Object.keys(instagram).length > 0) restoreData.instagram = instagram;
              if (Object.keys(reddit).length > 0) restoreData.reddit = reddit;
              if (Object.keys(tiktok).length > 0) restoreData.tiktok = tiktok;
              if (Object.keys(twitter).length > 0) restoreData.twitter = twitter;

              chrome.storage.local.set(restoreData, () => {
                resolve({ success: true });
              });
            }
          })
          .catch(e => {
            resolve({ success: false, error: e.message });
          });
      } else {
        // Simulated cloud pull
        console.log('[Sync] Restoring data from mock cloud...');
        setTimeout(() => {
          chrome.storage.local.get(['mockCloudBackupRow'], (result) => {
            const cloudData = result.mockCloudBackupRow;
            if (!cloudData) {
              resolve({ success: false, error: 'No cloud backups found.' });
              return;
            }
            // Merge downloaded cloud data back to local settings
            chrome.storage.local.set(cloudData, () => {
              resolve({ success: true });
            });
          });
        }, 800);
      }
    });
  },
  
  async deleteBackup() {
    const user = await authService.getCurrentUser();
    if (!user) return { success: true };

    if (syncSupabaseClient) {
      const { error: sessionError } = await syncSupabaseClient.auth.setSession({
        access_token: user.accessToken,
        refresh_token: user.refreshToken || ''
      });
      if (sessionError) {
        return { success: false, error: 'Session authentication failed: ' + sessionError.message };
      }
      
      const { error } = await syncSupabaseClient
        .from('backups')
        .delete()
        .eq('user_id', user.uid);
        
      if (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  }
};
