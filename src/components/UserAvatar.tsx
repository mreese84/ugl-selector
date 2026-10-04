import { useState } from 'react';
import type { User } from 'firebase/auth';

function initials(user: User) {
  const words = (user.displayName || user.email || '?').split(/[\s@._-]+/).filter(Boolean);
  const last = user.displayName && words.length > 1 ? words[words.length - 1][0] : '';
  return ((words[0]?.[0] ?? '?') + last).toUpperCase();
}

// The user's Google profile photo, or their initials if there isn't one or it fails to load
export default function UserAvatar({ user }: { user: User }) {
  const [failed, setFailed] = useState(false);
  const label = `Signed in as ${user.displayName ?? user.email ?? 'you'}`;

  if (user.photoURL && !failed) {
    return (
      <img
        src={user.photoURL}
        alt={label}
        title={label}
        referrerPolicy="no-referrer" // Google profile photos can refuse requests that send a referrer
        onError={() => setFailed(true)}
        className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-full bg-green-100 text-green-800 text-xs font-semibold flex items-center justify-center"
    >
      {initials(user)}
    </span>
  );
}
