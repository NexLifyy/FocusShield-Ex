// FocusShield Companion Website Interactivity & Auth Engine
document.addEventListener('DOMContentLoaded', () => {
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

  if (window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    window.supabaseClient = supabaseClient;
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
        
        const newUser = {
          uid: data.user.id,
          email: data.user.email,
          isPremium: false
        };
        localStorage.setItem('focusshield_mock_session', JSON.stringify(newUser));
        this.broadcastSession(newUser);
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
          isPremium: false,
          backups: []
        };
        users.push(newUser);
        this.saveUsers(users);
        this.login(email, password);
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
          .select('is_premium')
          .eq('id', data.user.id)
          .maybeSingle();

        const isPremium = profile ? profile.is_premium : false;
        const loggedUser = {
          uid: data.user.id,
          email: data.user.email,
          isPremium: isPremium
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

    async logout() {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      localStorage.removeItem('focusshield_mock_session');
      this.broadcastSession(null);
      window.location.href = 'index.html';
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
    const name = user.email.split('@')[0];
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    navActions.innerHTML = `
      <a href="account.html" class="btn btn-secondary" style="display:flex; align-items:center; gap:8px;">
        <div style="width:20px; height:20px; border-radius:50%; background:var(--accent); color:#000; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center;">${user.email.charAt(0).toUpperCase()}</div>
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
