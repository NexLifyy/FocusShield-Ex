// Initialize Supabase Client
let supabaseClient = null;
if (typeof supabase !== 'undefined' && FOCUSSHIELD_CONFIG.useLiveCloudDb) {
  supabaseClient = supabase.createClient(FOCUSSHIELD_CONFIG.supabaseUrl, FOCUSSHIELD_CONFIG.supabaseAnonKey);
}

const authService = {
  async getCurrentUser() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sessionUser'], (result) => {
        resolve(result.sessionUser || null);
      });
    });
  },

  async isPremium() {
    const user = await this.getCurrentUser();
    if (!user) {
      // Check if trial is active (trial is premium by default!)
      const isTrialActive = await new Promise((resolve) => {
        chrome.storage.local.get(['installDate'], (result) => {
          const install = result.installDate || Date.now();
          // 7 days free trial
          const isActive = (Date.now() - install) < (7 * 24 * 60 * 60 * 1000);
          resolve(isActive);
        });
      });
      return isTrialActive;
    }
    return !!user.isPremium;
  },

  async getTrialRemainingDays() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['installDate'], (result) => {
        const install = result.installDate || Date.now();
        const diff = (7 * 24 * 60 * 60 * 1000) - (Date.now() - install);
        const days = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
        resolve(days);
      });
    });
  },

  async signUp(email, password) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_premium: false
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed.');

      const sessionUser = { email, isPremium: false, uid: data.user.id };
      await new Promise((resolve) => {
        chrome.storage.local.set({ sessionUser }, resolve);
      });
      return sessionUser;
    } else {
      // Mock Sign Up
      const isPremium = email.toLowerCase().includes('premium') || email === 'mock@premium.com';
      const mockUser = { email, isPremium, uid: 'mock-uid-' + Date.now() };
      await new Promise((resolve) => {
        chrome.storage.local.set({ sessionUser: mockUser }, resolve);
      });
      return mockUser;
    }
  },

  async signIn(email, password) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign in failed.');

      // Fetch profile to see if user is premium
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_premium')
        .eq('id', data.user.id)
        .maybeSingle();

      const isPremium = profile ? profile.is_premium : false;
      const sessionUser = { email, isPremium, uid: data.user.id };
      await new Promise((resolve) => {
        chrome.storage.local.set({ sessionUser }, resolve);
      });
      return sessionUser;
    } else {
      // Mock Sign In
      const isPremium = email.toLowerCase().includes('premium') || email === 'mock@premium.com';
      const mockUser = { email, isPremium, uid: 'mock-uid-12345' };
      await new Promise((resolve) => {
        chrome.storage.local.set({ sessionUser: mockUser }, resolve);
      });
      return mockUser;
    }
  },

  async signOut() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    await new Promise((resolve) => {
      chrome.storage.local.remove(['sessionUser'], resolve);
    });
  }
};
