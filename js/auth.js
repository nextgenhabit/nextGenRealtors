/* =========================================================
   AUTH.JS — Firebase Google Sign-In & User Management
   ========================================================= */

const Auth = (() => {
  // Callback to run after successful sign-in (e.g., navigate to detail page)
  let _pendingCallback = null;

  /* ---- Internal: Save/update user in Firestore ---- */
  async function _saveUserToFirestore(user) {
    try {
      const userRef = db.collection('users').doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        // New user — create record
        await userRef.set({
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          firstSignIn: new Date().toISOString(),
          lastSignIn: new Date().toISOString(),
        });
      } else {
        // Existing user — update last sign-in
        await userRef.update({
          lastSignIn: new Date().toISOString(),
          displayName: user.displayName || doc.data().displayName || '',
          photoURL: user.photoURL || doc.data().photoURL || '',
        });
      }
    } catch (e) {
      console.error('Auth: Failed to save user to Firestore', e);
    }
  }

  /* ---- Internal: Update navbar to reflect auth state ---- */
  function _updateNavbar(user) {
    const container = document.getElementById('nav-user-area');
    if (!container) return;

    if (user) {
      const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
      const avatarHtml = user.photoURL
        ? `<img src="${user.photoURL}" alt="${initial}" class="user-avatar-img" referrerpolicy="no-referrer">`
        : `<div class="user-avatar-initials">${initial}</div>`;

      container.innerHTML = `
        <div class="user-nav-wrap" id="user-nav-dropdown-wrap">
          <button class="user-nav-btn" id="user-nav-btn" onclick="Auth.toggleUserMenu(event)" title="${user.displayName || user.email}">
            ${avatarHtml}
            <span class="user-nav-name">${(user.displayName || user.email || '').split(' ')[0]}</span>
            <span class="user-nav-chevron">▾</span>
          </button>
          <div class="user-nav-menu" id="user-nav-menu">
            <div class="user-nav-info">
              <strong>${user.displayName || 'User'}</strong>
              <span>${user.email}</span>
            </div>
            <hr class="user-nav-divider">
            <button class="user-nav-menu-item" onclick="Auth.signOut()">🚪 Sign Out</button>
          </div>
        </div>`;
    } else {
      container.innerHTML = `
        <button class="btn-signin-nav" id="nav-signin-btn" onclick="Auth.openSignInModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          Sign In
        </button>`;
    }
  }

  /* ---- Public API ---- */
  return {
    /** Initialize Firebase Auth — call once on page load */
    init() {
      const auth = firebase.auth();

      // Listen for auth state changes
      auth.onAuthStateChanged(async (user) => {
        _updateNavbar(user);

        if (user) {
          // Hide admin button unconditionally if a regular user is logged in
          const adminBtn = document.getElementById('admin-btn');
          if (adminBtn) adminBtn.classList.remove('show-admin-btn');

          // Save/update user in Firestore
          await _saveUserToFirestore(user);

          // Always close modal upon successful sign-in
          const modal = document.getElementById('user-auth-modal');
          if (modal) modal.classList.remove('open');
          
          // Reset button in case it was left in "Signing in..." state
          const btn = document.getElementById('google-signin-btn');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google`;
          }

          // If there was a pending action (e.g. view details), run it now
          if (typeof _pendingCallback === 'function') {
            const cb = _pendingCallback;
            _pendingCallback = null;
            cb();
          }
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const wrap = document.getElementById('user-nav-dropdown-wrap');
        if (wrap && !wrap.contains(e.target)) {
          const menu = document.getElementById('user-nav-menu');
          if (menu) menu.classList.remove('open');
        }
      });
    },

    /** Return the currently signed-in Firebase user object, or null */
    currentUser() {
      return firebase.auth().currentUser;
    },

    /** If user is signed in, run callback. Otherwise show sign-in modal. */
    requireAuth(callback) {
      const user = firebase.auth().currentUser;
      if (user) {
        callback();
      } else {
        _pendingCallback = callback;
        this.openSignInModal();
      }
    },

    /** Open the Google sign-in modal */
    openSignInModal() {
      const modal = document.getElementById('user-auth-modal');
      if (modal) modal.classList.add('open');
    },

    /** Close the Google sign-in modal */
    closeSignInModal() {
      const modal = document.getElementById('user-auth-modal');
      if (modal) modal.classList.remove('open');
      _pendingCallback = null; // Cancel any pending navigation
    },

    /** Trigger Google Sign-In popup */
    async signInWithGoogle() {
      const btn = document.getElementById('google-signin-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="auth-spinner"></span> Signing in...`;
      }

      const errorEl = document.getElementById('auth-modal-error');
      if (errorEl) errorEl.textContent = '';

      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await firebase.auth().signInWithPopup(provider);
        // onAuthStateChanged will fire and handle the rest
      } catch (err) {
        console.error('Auth: Google sign-in error', err);
        let msg = 'Sign-in failed. Please try again.';
        if (err.code === 'auth/popup-closed-by-user') msg = 'Sign-in cancelled.';
        if (err.code === 'auth/network-request-failed') msg = 'Network error. Check your connection.';
        if (errorEl) errorEl.textContent = msg;

        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google`;
        }
      }
    },

    /** Sign out the current user */
    async signOut() {
      try {
        // Close dropdown
        const menu = document.getElementById('user-nav-menu');
        if (menu) menu.classList.remove('open');

        await firebase.auth().signOut();
        showToast('You have been signed out.', '');
      } catch (e) {
        console.error('Auth: Sign-out error', e);
        showToast('Sign-out failed.', 'error');
      }
    },

    /** Toggle the user dropdown menu */
    toggleUserMenu(e) {
      e.stopPropagation();
      const menu = document.getElementById('user-nav-menu');
      if (menu) menu.classList.toggle('open');
    }
  };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Auth.init());
