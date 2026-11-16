/* ==========================================================================
   auth.js — simulated authentication, session, role-based routing & guards
   Exposed globally as `Auth`

   NOTE: This is an educational, front-end-only simulation. Credentials live
   in LocalStorage and are not real security.
   ========================================================================== */

(function (global) {
  'use strict';

  const SESSION_KEY = 'sms_session';

  const ROLE_HOME = {
    admin: 'dashboard.html',
    resident: 'resident-dashboard.html',
    vendor: 'vendor-dashboard.html'
  };

  const ROLE_LABEL = {
    admin: 'Administrator',
    resident: 'Resident',
    vendor: 'Vendor'
  };

  /* ------------------------------------------------------------ session */

  function currentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.id || !s.role) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function saveSession(user) {
    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      linkedId: user.linkedId || null,
      designation: user.designation || '',
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  /**
   * Attempt to sign in.
   * @returns {{ok: boolean, user?: object, reason?: string}}
   */
  function login(email, password, expectedRole) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    if (!cleanEmail || !cleanPass) {
      return { ok: false, reason: 'Please enter both your email address and password.' };
    }

    const users = DB.getData('users');
    const user = users.find(function (u) {
      return String(u.email || '').toLowerCase() === cleanEmail;
    });

    if (!user) {
      return { ok: false, reason: 'No account found for that email address. Try one of the demo accounts below.' };
    }
    if (user.password !== cleanPass) {
      return { ok: false, reason: 'Incorrect password. Please check and try again.' };
    }
    if (expectedRole && user.role !== expectedRole) {
      return {
        ok: false,
        reason: 'This account is registered as a ' + ROLE_LABEL[user.role] +
          ', not a ' + (ROLE_LABEL[expectedRole] || expectedRole) +
          '. Switch the role tab and try again.'
      };
    }
    if (user.role === 'resident') {
      const resident = DB.findById('residents', user.linkedId);
      if (resident && resident.status !== 'Active') {
        return { ok: false, reason: 'This resident account is currently inactive. Please contact the society office.' };
      }
    }
    if (user.role === 'vendor') {
      const vendor = DB.findById('vendors', user.linkedId);
      if (vendor && vendor.status !== 'Active') {
        return { ok: false, reason: 'This vendor account has been set to inactive. Please contact the society office.' };
      }
    }

    saveSession(user);
    return { ok: true, user: user };
  }

  function logout(redirect) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = redirect || 'login.html';
  }

  function homeFor(role) {
    return ROLE_HOME[role] || 'login.html';
  }

  /**
   * Guard a protected page. Redirects to login when the session is missing
   * or the role isn't allowed. Returns the session when access is granted.
   * @param {string[]} allowedRoles
   */
  function requireRole(allowedRoles) {
    const user = currentUser();
    if (!user) {
      window.location.replace('login.html');
      return null;
    }
    if (allowedRoles && allowedRoles.indexOf(user.role) === -1) {
      // Send the user to their own dashboard instead of showing a dead end
      window.location.replace(homeFor(user.role));
      return null;
    }
    return user;
  }

  function isAdmin() { const u = currentUser(); return !!u && u.role === 'admin'; }

  /** Resolve the resident record linked to the signed-in resident session. */
  function currentResident() {
    const u = currentUser();
    if (!u || u.role !== 'resident') return null;
    return DB.findById('residents', u.linkedId);
  }

  /** Resolve the vendor record linked to the signed-in vendor session. */
  function currentVendor() {
    const u = currentUser();
    if (!u || u.role !== 'vendor') return null;
    return DB.findById('vendors', u.linkedId);
  }

  /**
   * Create a login account for a newly added resident/vendor.
   * Password defaults to a predictable demo value and is shown to the admin.
   */
  function createLinkedUser(opts) {
    const users = DB.getData('users');
    const email = String(opts.email || '').trim().toLowerCase();
    if (!email) return null;
    if (users.some(function (u) { return String(u.email).toLowerCase() === email; })) {
      return null; // email already used by another account
    }
    const user = {
      id: DB.generateId('users', 'U'),
      name: opts.name,
      email: email,
      password: opts.password || 'demo1234',
      role: opts.role,
      linkedId: opts.linkedId,
      designation: opts.designation || '',
      createdAt: Utils.todayISO()
    };
    DB.addRecord('users', user);
    return user;
  }

  function updateLinkedUserEmail(oldEmail, newEmail, name) {
    const users = DB.getData('users');
    const u = users.find(function (x) { return String(x.email).toLowerCase() === String(oldEmail).toLowerCase(); });
    if (!u) return;
    DB.updateRecord('users', u.id, { email: String(newEmail).toLowerCase(), name: name || u.name });
  }

  function removeLinkedUser(userId) {
    if (!userId) return;
    DB.deleteRecord('users', userId);
  }

  function findByEmail(email) {
    return DB.getData('users').find(function (u) {
      return String(u.email).toLowerCase() === String(email).toLowerCase();
    }) || null;
  }

  global.Auth = {
    SESSION_KEY: SESSION_KEY,
    ROLE_HOME: ROLE_HOME,
    ROLE_LABEL: ROLE_LABEL,
    currentUser: currentUser,
    saveSession: saveSession,
    login: login,
    logout: logout,
    homeFor: homeFor,
    requireRole: requireRole,
    isAdmin: isAdmin,
    currentResident: currentResident,
    currentVendor: currentVendor,
    createLinkedUser: createLinkedUser,
    updateLinkedUserEmail: updateLinkedUserEmail,
    removeLinkedUser: removeLinkedUser,
    findByEmail: findByEmail
  };
})(window);
