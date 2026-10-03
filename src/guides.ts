import { useEffect, useState } from 'react';
import { deleteDoc, deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { PlayerGuide } from './types';

// Guides are members-only, so they live outside the public app/data doc (see firestore.rules)
const GUIDES = import.meta.env.DEV ? 'guides-dev' : 'guides';
const ACCESS_REF = doc(db, 'access', 'members');

export type LoadStatus = 'loading' | 'ready' | 'missing' | 'denied' | 'error';

interface Loaded<T> {
  key: string | null;
  status: LoadStatus;
  data: T | null;
}

const statusFor = (err: { code: string }): LoadStatus =>
  err.code === 'permission-denied' ? 'denied' : 'error';

// Subscribes to a trip's guide. Pass uid so the listener restarts after sign-in.
export function useGuide(tripId: string | null, uid: string | null) {
  const key = tripId && uid ? `${tripId}:${uid}` : null;
  const [state, setState] = useState<Loaded<PlayerGuide>>({ key: null, status: 'loading', data: null });

  useEffect(() => {
    if (!tripId || !uid) return;
    const k = `${tripId}:${uid}`;
    return onSnapshot(
      doc(db, GUIDES, tripId),
      (snap) =>
        setState({
          key: k,
          status: snap.exists() ? 'ready' : 'missing',
          data: snap.exists() ? (snap.data() as PlayerGuide) : null,
        }),
      (err) => setState({ key: k, status: statusFor(err), data: null })
    );
  }, [tripId, uid]);

  if (!key || state.key !== key) return { status: 'loading' as LoadStatus, guide: null };
  return { status: state.status, guide: state.data };
}

export function saveGuide(tripId: string, guide: PlayerGuide) {
  return setDoc(doc(db, GUIDES, tripId), guide);
}

export function deleteGuide(tripId: string) {
  return deleteDoc(doc(db, GUIDES, tripId));
}

// Member emails that unlock guides ({ memberId: email }). Admin only.
export function useMemberEmails(isAdmin: boolean) {
  const [state, setState] = useState<Loaded<Record<string, string>>>({ key: null, status: 'loading', data: null });

  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(
      ACCESS_REF,
      (snap) => setState({ key: 'admin', status: 'ready', data: snap.data()?.byMember ?? {} }),
      (err) => setState({ key: 'admin', status: statusFor(err), data: null })
    );
  }, [isAdmin]);

  if (!isAdmin || state.key !== 'admin') return { status: 'loading' as LoadStatus, emails: {} };
  return { status: state.status, emails: state.data ?? {} };
}

export function setMemberEmail(memberId: string, email: string) {
  const value = email.trim().toLowerCase();
  return setDoc(ACCESS_REF, { byMember: { [memberId]: value || deleteField() } }, { merge: true });
}
