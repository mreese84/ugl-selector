import { useState } from 'react';
import { useAppState } from '../store';
import { useAuth } from '../auth';
import { setMemberEmail, useMemberEmails } from '../guides';

// Admin-only: the Google email that lets this member open Player's Guides.
// Remount via key when the saved email changes so the input picks it up.
function EmailField({ memberId, email }: { memberId: string; email: string }) {
  const [value, setValue] = useState(email);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const v = value.trim().toLowerCase();
    if (v === email) return;
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError('Not a valid email');
      return;
    }
    setError(null);
    try {
      await setMemberEmail(memberId, v);
    } catch {
      setError('Save failed');
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="Google email for guide access"
        className="flex-1 min-w-0 px-2 py-1 -mx-2 text-xs text-gray-500 bg-transparent rounded-md border border-transparent
                   placeholder:text-gray-300 hover:border-gray-200 focus:outline-none focus:border-green-500
                   focus:text-gray-800 transition-colors"
      />
      {error && <span className="text-xs text-red-500 shrink-0">{error}</span>}
    </div>
  );
}

export default function MembersTab() {
  const { isAdmin } = useAuth();
  const { members, addMember, updateMember, removeMember } = useAppState();
  const { status: emailStatus, emails } = useMemberEmails(isAdmin);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMember(trimmed);
    setNewName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateMember(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Members</h2>
        {isAdmin && (
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add a member (e.g. John D)"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30
                         focus:border-green-500 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium
                         hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          No members yet. Add someone above to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100
                         shadow-sm hover:shadow-md transition-shadow"
            >
              {editingId === member.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg bg-white
                               focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                  />
                  <button
                    onClick={saveEdit}
                    className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-400 hover:text-gray-600 text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-800 font-medium">{member.name}</span>
                    {isAdmin && emailStatus === 'ready' && (
                      <EmailField
                        key={`${member.id}:${emails[member.id] ?? ''}`}
                        memberId={member.id}
                        email={emails[member.id] ?? ''}
                      />
                    )}
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => startEdit(member.id, member.name)}
                        className="text-gray-400 hover:text-green-600 text-sm transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          removeMember(member.id);
                          if (emails[member.id]) setMemberEmail(member.id, '');
                        }}
                        className="text-gray-400 hover:text-red-500 text-sm transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-gray-400">
        {members.length} member{members.length !== 1 ? 's' : ''}
        {isAdmin && emailStatus === 'ready' && (
          <> · {members.filter((m) => emails[m.id]).length} with Player's Guide access</>
        )}
      </p>
      {isAdmin && (emailStatus === 'denied' || emailStatus === 'error') && (
        <p className="text-sm text-amber-600">
          Couldn't load member emails. Make sure the rules in firestore.rules are published in the Firebase console.
        </p>
      )}
    </div>
  );
}
