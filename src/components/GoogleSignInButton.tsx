import { useEffect, useRef, useState } from 'react';
import { googleSignInConfigured, onSignInError, renderGoogleButton, type GoogleButtonOptions } from '../googleSignIn';

// Google's own "Sign in with Google" button
export default function GoogleSignInButton(options: GoogleButtonOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const { size, text, shape, theme, width } = options;

  useEffect(() => onSignInError(setSignInError), []);

  useEffect(() => {
    if (!googleSignInConfigured) return;
    let cancelled = false;
    renderGoogleButton(ref.current!, { size, text, shape, theme, width }).catch((err) => {
      console.error(err);
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [size, text, shape, theme, width]);

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div ref={ref} className="min-h-8" />
      {!googleSignInConfigured && <p className="text-xs text-gray-400 text-center">Sign-in isn't set up yet.</p>}
      {loadError && (
        <p className="text-xs text-red-600 text-center">Couldn't load Google sign-in. Check your connection and reload.</p>
      )}
      {signInError && <p className="text-xs text-red-600 text-center">{signInError}</p>}
    </div>
  );
}
