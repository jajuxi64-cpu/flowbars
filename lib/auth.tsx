import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as db from './db';
import { hashPassword, verifyPassword, randomToken, passwordStrength } from './crypto';
import { matches } from './permissions';
import { getSettings } from './seed';

export type User = db.Row & {
  username: string;
  email?: string;
  passwordHash?: string;
  provider: 'password' | 'google' | 'facebook';
  roles: string[];
  banned?: boolean;
  muted?: boolean;
  mustChangePassword?: boolean;
  avatar?: string;
  banner?: string;
  bio?: string;
  lastSeen?: string;
};

const SESSION_KEY = 'fb.session';

type AuthState = {
  user: User | null;
  ready: boolean;
  permissions: string[];
  can: (perm: string) => boolean;
  signUp: (u: { username: string; email: string; password: string }) => Promise<User>;
  signIn: (username: string, password: string) => Promise<User>;
  signOut: () => void;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;
  requestReset: (username: string) => Promise<string>;
  resetWithToken: (token: string, newPw: string) => Promise<void>;
  oauthSignIn: (provider: 'google' | 'facebook') => Promise<User>;
  refresh: () => void;
};

const Ctx = createContext<AuthState>(null as any);
export const useAuth = () => useContext(Ctx);

function logSecurity(type: string, meta: any = {}) {
  db.insert('security_events', { type, meta, at: new Date().toISOString() });
}

function logLogin(userId: string | null, username: string, ok: boolean, method: string, reason?: string) {
  db.insert('login_history', {
    userId,
    username,
    ok,
    method,
    reason: reason || '',
    at: new Date().toISOString(),
    agent: navigator.userAgent.slice(0, 160),
  });
}

export function rolePermissions(roleIds: string[]): string[] {
  const roles = db.all('roles').filter((r) => roleIds.includes(r.id));
  return Array.from(new Set(roles.flatMap((r) => r.permissions || [])));
}

export function userPermissions(user: User | null): string[] {
  if (!user) return [];
  if (user.banned) return [];
  return rolePermissions(user.roles || []);
}

/** Authorisation gate used by every admin mutation. Throws when denied. */
export function assertCan(user: User | null, perm: string) {
  if (!matches(userPermissions(user), perm)) {
    logSecurity('permission_denied', { user: user?.username || 'anonymous', perm });
    throw new Error(`Permission denied: ${perm}`);
  }
}

function newSession(userId: string) {
  const s = getSettings();
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + s.security.sessionHours * 3600_000).toISOString();
  db.insert('sessions', {
    token,
    userId,
    expiresAt,
    agent: navigator.userAgent.slice(0, 160),
    at: new Date().toISOString(),
  });
  localStorage.setItem(SESSION_KEY, token);
  return token;
}

function currentSessionUser(): User | null {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;
  const session = db.all('sessions').find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.remove('sessions', session.id);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const u = db.find<User>('users', session.userId);
  if (!u || u.banned) return null;
  return u;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const u = currentSessionUser();
    setUser(u);
    setReady(true);
    if (u) db.update('users', u.id, { lastSeen: new Date().toISOString() });
  }, [tick]);

  useEffect(() => {
    const unsub = db.subscribe(() => setUser(currentSessionUser()));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    db.setAuditHook((entry) => {
      const actor = currentSessionUser();
      db.insert('audit_log', {
        ...entry,
        actorId: actor?.id || null,
        actor: actor?.username || 'system',
        at: new Date().toISOString(),
      });
    });
    return () => db.setAuditHook(null);
  }, []);

  const signUp: AuthState['signUp'] = async ({ username, email, password }) => {
    const s = getSettings();
    if (!s.site.registrationOpen) throw new Error('Registration is currently closed.');
    const uname = username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(uname))
      throw new Error('Username must be 3-24 chars (letters, numbers, _ . -).');
    if (db.all<User>('users').some((u) => u.username.toLowerCase() === uname.toLowerCase()))
      throw new Error('That username is taken.');
    if (email && db.all<User>('users').some((u) => (u.email || '').toLowerCase() === email.toLowerCase()))
      throw new Error('That email is already registered.');
    if (password.length < s.security.minPasswordLength)
      throw new Error(`Password must be at least ${s.security.minPasswordLength} characters.`);
    if (s.security.requireStrongPassword && passwordStrength(password).score < 3)
      throw new Error('Password too weak: ' + passwordStrength(password).issues.join(', '));

    const isFirstUser = db.count('users') === 0;
    const passwordHash = await hashPassword(password);
    const created = db.insert<User>('users', {
      username: uname,
      email,
      passwordHash,
      provider: 'password',
      roles: isFirstUser ? ['role_owner'] : ['role_member'],
      bio: 'Battle rap fanatic.',
      avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(uname)}`,
      banner: '',
      banned: false,
      muted: false,
      lastSeen: new Date().toISOString(),
    } as any);
    newSession(created.id);
    logLogin(created.id, uname, true, 'signup');
    logSecurity('account_created', { username: uname, owner: isFirstUser });
    refresh();
    return created;
  };

  const signIn: AuthState['signIn'] = async (username, password) => {
    const s = getSettings();
    const uname = username.trim().toLowerCase();
    const since = Date.now() - s.security.lockoutMinutes * 60_000;
    const fails = db
      .all('login_history')
      .filter(
        (h) => !h.ok && String(h.username).toLowerCase() === uname && new Date(h.at).getTime() > since,
      );
    if (fails.length >= s.security.maxLoginAttempts) {
      logSecurity('login_rate_limited', { username: uname });
      throw new Error(
        `Too many failed attempts. Try again in ${s.security.lockoutMinutes} minutes.`,
      );
    }
    const u = db
      .all<User>('users')
      .find(
        (x) =>
          x.username.toLowerCase() === uname || (x.email || '').toLowerCase() === uname,
      );
    if (!u || !u.passwordHash) {
      logLogin(null, username, false, 'password', 'no_such_user');
      throw new Error('Invalid username or password.');
    }
    if (u.banned) {
      logLogin(u.id, username, false, 'password', 'banned');
      throw new Error('This account is banned.');
    }
    const ok = await verifyPassword(password, u.passwordHash);
    if (!ok) {
      logLogin(u.id, username, false, 'password', 'bad_password');
      throw new Error('Invalid username or password.');
    }
    newSession(u.id);
    logLogin(u.id, u.username, true, 'password');
    refresh();
    return u;
  };

  const signOut = () => {
    const token = localStorage.getItem(SESSION_KEY);
    const session = db.all('sessions').find((s) => s.token === token);
    if (session) db.remove('sessions', session.id);
    localStorage.removeItem(SESSION_KEY);
    refresh();
  };

  const changePassword: AuthState['changePassword'] = async (oldPw, newPw) => {
    const u = currentSessionUser();
    if (!u) throw new Error('Not signed in.');
    const s = getSettings();
    if (u.passwordHash && !(await verifyPassword(oldPw, u.passwordHash)))
      throw new Error('Current password is incorrect.');
    if (newPw.length < s.security.minPasswordLength)
      throw new Error(`Password must be at least ${s.security.minPasswordLength} characters.`);
    db.update('users', u.id, {
      passwordHash: await hashPassword(newPw),
      mustChangePassword: false,
    });
    logSecurity('password_changed', { username: u.username });
    refresh();
  };

  const requestReset: AuthState['requestReset'] = async (username) => {
    const u = db
      .all<User>('users')
      .find(
        (x) =>
          x.username.toLowerCase() === username.toLowerCase() ||
          (x.email || '').toLowerCase() === username.toLowerCase(),
      );
    if (!u) throw new Error('No account matches that username or email.');
    const token = randomToken(12);
    db.update('users', u.id, {
      resetToken: token,
      resetExpires: new Date(Date.now() + 3600_000).toISOString(),
    });
    logSecurity('password_reset_requested', { username: u.username });
    return token;
  };

  const resetWithToken: AuthState['resetWithToken'] = async (token, newPw) => {
    const u = db.all<User>('users').find((x) => (x as any).resetToken === token);
    if (!u) throw new Error('Invalid reset token.');
    if (new Date((u as any).resetExpires).getTime() < Date.now())
      throw new Error('Reset token has expired.');
    db.update('users', u.id, {
      passwordHash: await hashPassword(newPw),
      resetToken: null,
      resetExpires: null,
    });
    logSecurity('password_reset_completed', { username: u.username });
  };

  const oauthSignIn: AuthState['oauthSignIn'] = async (provider) => {
    const s = getSettings();
    const profile =
      provider === 'google'
        ? await googleOAuth(s.integrations.googleClientId)
        : await facebookOAuth(s.integrations.facebookAppId);

    let u = db
      .all<User>('users')
      .find((x) => x.providerId === profile.id || (profile.email && x.email === profile.email));
    if (!u) {
      const base = (profile.name || profile.email || provider).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 20);
      let uname = base || provider + randomToken(2);
      let i = 1;
      while (db.all<User>('users').some((x) => x.username.toLowerCase() === uname.toLowerCase()))
        uname = `${base}${i++}`;
      u = db.insert<User>('users', {
        username: uname,
        email: profile.email,
        provider,
        providerId: profile.id,
        roles: db.count('users') === 0 ? ['role_owner'] : ['role_member'],
        avatar: profile.picture || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uname}`,
        bio: '',
        banned: false,
      } as any);
    }
    if (u.banned) throw new Error('This account is banned.');
    newSession(u.id);
    logLogin(u.id, u.username, true, provider);
    refresh();
    return u;
  };

  const permissions = useMemo(() => userPermissions(user), [user, tick]);
  const can = useCallback((p: string) => matches(permissions, p), [permissions]);

  const value: AuthState = {
    user,
    ready,
    permissions,
    can,
    signUp,
    signIn,
    signOut,
    changePassword,
    requestReset,
    resetWithToken,
    oauthSignIn,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ------------------- Real OAuth integrations ------------------- */

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.id = id;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(el);
  });
}

function decodeJwt(token: string): any {
  const payload = token.split('.')[1];
  return JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))));
}

export type OAuthProfile = { id: string; email?: string; name?: string; picture?: string };

/** Google Identity Services. Requires a real OAuth Client ID configured in Admin → Integrations. */
export async function googleOAuth(clientId: string): Promise<OAuthProfile> {
  if (!clientId)
    throw new Error(
      'Google sign-in is not configured. An Owner must set a Google OAuth Client ID in Admin → System → Integrations (or the VITE_GOOGLE_CLIENT_ID env var), and add this origin to the authorised JavaScript origins in Google Cloud Console.',
    );
  await loadScript('https://accounts.google.com/gsi/client', 'gsi-client');
  const google = (window as any).google;
  if (!google?.accounts?.id) throw new Error('Google Identity Services failed to initialise.');
  const nonce = randomToken(16);
  sessionStorage.setItem('fb.oauth.nonce', nonce);
  return new Promise<OAuthProfile>((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: clientId,
      nonce,
      callback: (resp: any) => {
        try {
          const claims = decodeJwt(resp.credential);
          if (claims.nonce !== sessionStorage.getItem('fb.oauth.nonce'))
            return reject(new Error('OAuth nonce mismatch — request rejected.'));
          if (claims.aud !== clientId) return reject(new Error('OAuth audience mismatch.'));
          resolve({ id: 'google:' + claims.sub, email: claims.email, name: claims.name, picture: claims.picture });
        } catch (e: any) {
          reject(e);
        }
      },
    });
    google.accounts.id.prompt((n: any) => {
      if (n.isNotDisplayed?.() || n.isSkippedMoment?.())
        reject(
          new Error(
            'Google did not display the sign-in prompt. Check that this exact origin is whitelisted for your OAuth client.',
          ),
        );
    });
  });
}

/** Facebook Login JS SDK. Requires a real Facebook App ID configured in Admin → Integrations. */
export async function facebookOAuth(appId: string): Promise<OAuthProfile> {
  if (!appId)
    throw new Error(
      'Facebook sign-in is not configured. An Owner must set a Facebook App ID in Admin → System → Integrations (or the VITE_FACEBOOK_APP_ID env var) and whitelist this domain in the Facebook app settings.',
    );
  await loadScript('https://connect.facebook.net/en_US/sdk.js', 'fb-sdk');
  const FB = (window as any).FB;
  if (!FB) throw new Error('Facebook SDK failed to load.');
  FB.init({ appId, cookie: true, xfbml: false, version: 'v19.0' });
  const authResp = await new Promise<any>((resolve, reject) => {
    FB.login(
      (r: any) => (r.authResponse ? resolve(r.authResponse) : reject(new Error('Facebook login cancelled.'))),
      { scope: 'public_profile,email' },
    );
  });
  const me = await new Promise<any>((resolve) =>
    FB.api('/me', { fields: 'id,name,email,picture', access_token: authResp.accessToken }, resolve),
  );
  return { id: 'facebook:' + me.id, email: me.email, name: me.name, picture: me.picture?.data?.url };
}
