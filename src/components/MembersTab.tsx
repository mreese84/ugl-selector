import { useState } from 'react';
import { useAppState } from '../store';
import { useAuth } from '../auth';

export default function MembersTab() {
  const { isAdmin } = useAuth();
  const { members, addMember, updateMember, removeMember } = useAppState();
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
                  <span className="flex-1 text-gray-800 font-medium">{member.name}</span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => startEdit(member.id, member.name)}
                        className="text-gray-400 hover:text-green-600 text-sm transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeMember(member.id)}
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
      </p>
    </div>
  );
}
