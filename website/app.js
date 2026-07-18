// FocusShield Companion Website Interactivity & Auth Engine

// Override localStorage methods to notify extension instantly of session changes
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (key === 'focusshield_mock_session') {
    document.dispatchEvent(new CustomEvent('focusshield-session-updated'));
  }
};
localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === 'focusshield_mock_session') {
    document.dispatchEvent(new CustomEvent('focusshield-session-updated'));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Parse redirect query parameter if present and store in sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');
  // Only overwrite auth_redirect if not already set to a pricing intent
  const existingRedirect = sessionStorage.getItem('auth_redirect') || '';
  if (redirectParam === 'account' && !existingRedirect.startsWith('pricing.html')) {
    console.log('[FocusShield] Found redirect parameter, saving redirect target: account.html');
    sessionStorage.setItem('auth_redirect', 'account.html');
  }

  // Initialize FAQ accordions
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const parent = question.parentElement;
      const isActive = parent.classList.contains('active');
      
      // Close all FAQs
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Toggle current
      if (!isActive) {
        parent.classList.add('active');
      }
    });
  });

  // Simple Mobile Nav toggle helper if added later
  // Setup shared mock authentication helpers
  // Initialize Supabase Client
  const supabaseUrl = 'https://evmbcpinujaufvwcxaaa.supabase.co';
  const supabaseAnonKey = 'sb_publishable_FwqzwLUMWBAAmp6IG75ocQ_0BbOqr_D';
  let supabaseClient = null;

  console.log('[FocusShield] Initializing client auth engine...');
  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      window.supabaseClient = supabaseClient;
      console.log('[FocusShield] Live Supabase client initialized successfully!');

      // Set up automatic Google OAuth hash session processing
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('[FocusShield] Supabase Auth event:', event);
        if (session && session.user) {
          // Retrieve current user details from metadata
          const fullName = session.user.user_metadata ? (session.user.user_metadata.full_name || '') : '';
          
          // Get premium status dynamically from database table
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_premium, plan_type')
            .eq('id', session.user.id)
            .maybeSingle();

          const isPremium = profile ? profile.is_premium : false;
          const planType = (profile && profile.plan_type && profile.plan_type !== 'free') ? profile.plan_type : (isPremium ? 'yearly' : 'free');
          
          const loggedUser = {
            uid: session.user.id,
            email: session.user.email,
            fullName: fullName,
            isPremium: isPremium,
            planType: planType,
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          };
          localStorage.setItem('focusshield_mock_session', JSON.stringify(loggedUser));
          if (window.authEngine && window.authEngine.broadcastSession) {
            window.authEngine.broadcastSession(loggedUser);
          }
          
          // Redirect logic: check if there's a saved auth_redirect target
          const redirectTarget = sessionStorage.getItem('auth_redirect');
          const path = window.location.pathname;
          const isOAuthCallback = window.location.hash || window.location.href.includes('error=');
          
          if (redirectTarget) {
            console.log('[FocusShield] OAuth resolved. Redirecting to target:', redirectTarget);
            sessionStorage.removeItem('auth_redirect');
            window.location.href = redirectTarget;
          } else if (path.endsWith('login.html') || path.endsWith('signup.html')) {
            console.log('[FocusShield] OAuth resolved on auth page. Redirecting user to account page...');
            window.location.href = 'account.html';
          } else if ((path.endsWith('index.html') || path === '/' || path === '' || path.endsWith('/')) && isOAuthCallback) {
            console.log('[FocusShield] OAuth callback landed on homepage. Redirecting to account...');
            window.location.href = 'account.html';
          } else if (path.endsWith('account.html') && isOAuthCallback) {
            console.log('[FocusShield] OAuth callback resolved on account page. Reloading cleanly...');
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
            window.location.reload();
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('focusshield_mock_session');
          if (window.authEngine && window.authEngine.broadcastSession) {
            window.authEngine.broadcastSession(null);
          }
        }
      });
    } catch (e) {
      console.error('[FocusShield] Failed to initialize Supabase client:', e);
    }
  } else {
    console.warn('[FocusShield] window.supabase is undefined! Falling back to Mock Auth.');
  }

  // Setup shared mock & live authentication helpers
  window.authEngine = {
    getUsers() {
      return JSON.parse(localStorage.getItem('focusshield_mock_users') || '[]');
    },
    
    saveUsers(users) {
      localStorage.setItem('focusshield_mock_users', JSON.stringify(users));
    },

    getCurrentUser() {
      return JSON.parse(localStorage.getItem('focusshield_mock_session') || 'null');
    },

    async signUp(email, password, fullName = '') {
      if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              is_premium: false,
              full_name: fullName
            }
          }
        });
        if (error) throw error;
        if (!data.user) throw new Error('Sign up failed.');
        
        const isConfirmed = !!data.session;
        const newUser = {
          uid: data.user.id,
          email: data.user.email,
          fullName: fullName,
          isPremium: false,
          isConfirmed: isConfirmed
        };
        
        // Never auto-login on signup
        return newUser;
      } else {
        // Fallback to Mock
        const users = this.getUsers();
        if (users.some(u => u.email === email)) {
          throw new Error('An account with this email already exists.');
        }
        const newUser = {
          uid: 'web-uid-' + Math.random().toString(36).substr(2, 9),
          email: email,
          password: password,
          fullName: fullName,
          isPremium: false,
          isConfirmed: true,
          backups: []
        };
        users.push(newUser);
        this.saveUsers(users);
        // Never auto-login on signup
        return newUser;
      }
    },

    async login(email, password) {
      if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (!data.user) throw new Error('Login failed.');

        // Get premium status from profile table
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('is_premium, plan_type')
          .eq('id', data.user.id)
          .maybeSingle();

        const isPremium = profile ? profile.is_premium : false;
        const planType = (profile && profile.plan_type && profile.plan_type !== 'free') ? profile.plan_type : (isPremium ? 'yearly' : 'free');
        const fullName = data.user.user_metadata ? (data.user.user_metadata.full_name || '') : '';
        const loggedUser = {
          uid: data.user.id,
          email: data.user.email,
          fullName: fullName,
          isPremium: isPremium,
          planType: planType,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        };
        localStorage.setItem('focusshield_mock_session', JSON.stringify(loggedUser));
        this.broadcastSession(loggedUser);
        return loggedUser;
      } else {
        // Fallback to Mock
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
          throw new Error('Invalid email or password.');
        }
        localStorage.setItem('focusshield_mock_session', JSON.stringify(user));
        this.broadcastSession(user);
        return user;
      }
    },

    async loginWithGoogle() {
      if (supabaseClient) {
        // Build robust redirection path pointing to account.html in the same web folder
        const redirectUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/account.html');
        console.log('[FocusShield] Triggering Google OAuth with redirect:', redirectUrl);
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl
          }
        });
        if (error) throw error;
      } else {
        // Local preview/fallback mock login
        console.log('[FocusShield] Supabase client absent. Simulating Mock Google Sign-In...');
        const mockUser = {
          uid: 'mock-google-' + Math.random().toString(36).substr(2, 9),
          email: 'google.user@gmail.com',
          fullName: 'Google User',
          isPremium: false
        };
        localStorage.setItem('focusshield_mock_session', JSON.stringify(mockUser));
        this.broadcastSession(mockUser);
        window.location.href = 'account.html';
      }
    },

    async logout() {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      localStorage.removeItem('focusshield_mock_session');
      this.broadcastSession(null);
      
      const path = window.location.pathname;
      if (path.endsWith('account.html')) {
        window.location.href = 'index.html';
      } else {
        window.location.reload();
      }
    },

    async updateName(fullName) {
      const user = this.getCurrentUser();
      if (!user) throw new Error('User not logged in.');

      if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.updateUser({
          data: { full_name: fullName }
        });
        if (error) throw error;
      }

      user.fullName = fullName;
      localStorage.setItem('focusshield_mock_session', JSON.stringify(user));
      this.broadcastSession(user);

      // Update mock list
      const users = this.getUsers();
      const userIdx = users.findIndex(u => u.email === user.email);
      if (userIdx !== -1) {
        users[userIdx].fullName = fullName;
        this.saveUsers(users);
      }
      return user;
    },

    async upgradeToPremium(customEmail = null) {
      const user = this.getCurrentUser();
      const emailTarget = customEmail || (user ? user.email : null);
      if (!emailTarget) return;

      if (supabaseClient && user && user.email === emailTarget) {
        const { error } = await supabaseClient
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', user.uid);
        
        if (error) console.error('[Supabase] Profile upgrade failed:', error);
      }

      // Sync local session & mock users list
      if (user && user.email === emailTarget) {
        user.isPremium = true;
        localStorage.setItem('focusshield_mock_session', JSON.stringify(user));
        this.broadcastSession(user);
      }

      // Update general mock list
      const users = this.getUsers();
      const userIdx = users.findIndex(u => u.email === emailTarget);
      if (userIdx !== -1) {
        users[userIdx].isPremium = true;
        this.saveUsers(users);
      } else if (!user) {
        // Create user if checkout occurred without logged in session
        const newUser = {
          uid: 'web-uid-' + Math.random().toString(36).substr(2, 9),
          email: emailTarget,
          isPremium: true,
          backups: []
        };
        users.push(newUser);
        this.saveUsers(users);
      }
    },

    broadcastSession(user) {
      const event = new CustomEvent('authChange', { detail: user });
      window.dispatchEvent(event);
      
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage(
            "hbhffgkhmdfgdgpdjllcbmkmknpmhepf",
            { type: "AUTH_SYNC", user: user }
          );
        } catch(e) {}
      }
    }
  };

  // Setup account page UI if on account page
  updateNavbarAuthUI();
});

// Update Navbar links dynamically based on Auth state
function updateNavbarAuthUI() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const user = window.authEngine ? window.authEngine.getCurrentUser() : JSON.parse(localStorage.getItem('focusshield_mock_session') || 'null');
  
  if (user) {
    const displayName = user.fullName || user.email.split('@')[0];
    const capitalized = user.fullName ? user.fullName : displayName.charAt(0).toUpperCase() + displayName.slice(1);
    const initial = capitalized.charAt(0).toUpperCase();
    navActions.innerHTML = `
      <a href="account.html" class="btn btn-secondary" style="display:flex; align-items:center; gap:8px;">
        <div style="width:20px; height:20px; border-radius:50%; background:var(--accent); color:#000; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center;">${initial}</div>
        <span>${capitalized}</span>
      </a>
      <button onclick="window.authEngine.logout()" class="btn btn-secondary">Logout</button>
    `;
  } else {
    navActions.innerHTML = `
      <a href="login.html" class="btn btn-secondary">Login</a>
      <a href="signup.html" class="btn btn-primary">Sign Up</a>
    `;
  }
}

// Global hook to update UI upon auth change events
window.addEventListener('authChange', () => {
  updateNavbarAuthUI();
});
