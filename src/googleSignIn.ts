import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

// Sign in with Google's own button (Google Identity Services), then hand the ID token to
// Firebase. This avoids Firebase's sign-in popup, which runs on the separate
// <project>.firebaseapp.com domain and can lose its state in Safari and other browsers
// that partition storage ("missing initial state").

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export const googleSignInConfigured = !!CLIENT_ID;

interface CredentialResponse {
  credential: string; // Google ID token (JWT)
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

interface GoogleId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

// ── Sign-in errors, for the button to show ─────────────────────────

type ErrorListener = (message: string | null) => void;
const errorListeners = new Set<ErrorListener>();

export function onSignInError(listener: ErrorListener) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

const reportError = (message: string | null) => errorListeners.forEach((listener) => listener(message));

async function handleCredential({ credential }: CredentialResponse) {
  try {
    await signInWithCredential(auth, GoogleAuthProvider.credential(credential));
    reportError(null);
  } catch (err) {
    console.error('Firebase sign-in failed', err);
    reportError('Sign-in failed. Please try again.');
  }
}

// ── Loading Google's script ────────────────────────────────────────

let loading: Promise<GoogleId> | null = null;
let initialized = false;

function loadGoogle(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const ready = () => window.google?.accounts?.id;
    if (ready()) return resolve(ready()!);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (ready() ? resolve(ready()!) : reject(new Error('Google sign-in did not start')));
    script.onerror = () => {
      loading = null; // allow another try
      script.remove();
      reject(new Error('Google sign-in could not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function renderGoogleButton(parent: HTMLElement, options: GoogleButtonOptions) {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  const google = await loadGoogle();
  if (!initialized) {
    google.initialize({ client_id: CLIENT_ID, callback: handleCredential, auto_select: false, ux_mode: 'popup' });
    initialized = true;
  }
  parent.replaceChildren(); // StrictMode renders effects twice
  google.renderButton(parent, options);
}

// After signing out, don't let Google sign the user straight back in
export function forgetGoogleSignIn() {
  window.google?.accounts?.id?.disableAutoSelect();
}
