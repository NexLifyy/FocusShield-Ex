// Reuse global Supabase Client initialized in auth.js to avoid duplicate instances warnings
let syncSupabaseClient = typeof supabaseClient !== 'undefined' ? supabaseClient : null;

const syncService = {
  // Sync local data to cloud database
  async backupSettings() {
    const user = await authService.getCurrentUser();
    if (!user) return { success: false, error: 'User not signed in.' };

    return new Promise((resolve) => {
      // Gather local settings
      chrome.storage.local.get([
        'customSites',
        'schedules',
        'focusStats',
        'filterAdult',
        'filterGaming',
        'filterShopping',
        'filterGambling',
        'filterStreaming',
        'previousPlatformStates'
      ], async (data) => {
        if (syncSupabaseClient) {
          // Live Supabase sync logic
          try {
            const { error } = await syncSupabaseClient
              .from('backups')
              .upsert({
                user_id: user.uid,
                custom_sites: data.customSites || [],
                schedules: data.schedules || [],
                focus_stats: data.focusStats || {},
                filter_adult: !!data.filterAdult,
                filter_gaming: !!data.filterGaming,
                filter_shopping: !!data.filterShopping,
                filter_gambling: !!data.filterGambling,
                filter_streaming: !!data.filterStreaming,
                previous_platform_states: data.previousPlatformStates || {},
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

  // Pull settings from cloud database and merge locally
  async restoreSettings() {
    const user = await authService.getCurrentUser();
    if (!user) return { success: false, error: 'User not signed in.' };

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
              const restoreData = {
                customSites: data.custom_sites,
                schedules: data.schedules,
                focusStats: data.focus_stats,
                filterAdult: data.filter_adult,
                filterGaming: data.filter_gaming,
                filterShopping: data.filter_shopping,
                filterGambling: data.filter_gambling,
                filterStreaming: data.filter_streaming,
                previousPlatformStates: data.previous_platform_states
              };
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
  }
};
