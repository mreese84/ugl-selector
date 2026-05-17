import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Member, Trip } from './types';

interface AppState {
  members: Member[];
  trips: Trip[];
  setMembers: (members: Member[]) => void;
  setTrips: (trips: Trip[]) => void;
  addMember: (name: string) => Member;
  updateMember: (id: string, name: string) => void;
  removeMember: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => Trip;
  updateTrip: (trip: Trip) => void;
  removeTrip: (id: string) => void;
  exportData: () => string;
  importData: (json: string) => void;
}

const MEMBERS_KEY = 'ugl-members';
const TRIPS_KEY = 'ugl-trips';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(): string {
  return crypto.randomUUID();
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [members, setMembersState] = useState<Member[]>(() =>
    loadFromStorage<Member[]>(MEMBERS_KEY, [])
  );
  const [trips, setTripsState] = useState<Trip[]>(() =>
    loadFromStorage<Trip[]>(TRIPS_KEY, [])
  );

  useEffect(() => saveToStorage(MEMBERS_KEY, members), [members]);
  useEffect(() => saveToStorage(TRIPS_KEY, trips), [trips]);

  const setMembers = (m: Member[]) => setMembersState(m);
  const setTrips = (t: Trip[]) => setTripsState(t);

  const addMember = (name: string): Member => {
    const member: Member = { id: generateId(), name };
    setMembersState((prev) => [...prev, member]);
    return member;
  };

  const updateMember = (id: string, name: string) => {
    setMembersState((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m))
    );
  };

  const removeMember = (id: string) => {
    setMembersState((prev) => prev.filter((m) => m.id !== id));
  };

  const addTrip = (tripData: Omit<Trip, 'id'>): Trip => {
    const trip: Trip = { ...tripData, id: generateId() };
    setTripsState((prev) => [...prev, trip]);
    return trip;
  };

  const updateTrip = (trip: Trip) => {
    setTripsState((prev) => prev.map((t) => (t.id === trip.id ? trip : t)));
  };

  const removeTrip = (id: string) => {
    setTripsState((prev) => prev.filter((t) => t.id !== id));
  };

  const exportData = (): string => {
    return JSON.stringify({ members, trips }, null, 2);
  };

  const importData = (json: string) => {
    const data = JSON.parse(json);
    if (data.members && data.trips) {
      setMembersState(data.members);
      setTripsState(data.trips);
    }
  };

  return (
    <AppContext.Provider
      value={{
        members,
        trips,
        setMembers,
        setTrips,
        addMember,
        updateMember,
        removeMember,
        addTrip,
        updateTrip,
        removeTrip,
        exportData,
        importData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be inside AppProvider');
  return ctx;
}
