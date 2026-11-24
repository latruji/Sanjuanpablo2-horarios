'use client';

import { useState, useEffect } from 'react';

export default function UsersModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [initialAdmins, setInitialAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('portero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setInitialAdmins(data.initialAdmins || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar usuario');
      } else {
        setEmail('');
        setName('');
        await loadUsers();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Â¿Quitar acceso a este correo?')) return;
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    await loadUsers();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Usuarios autorizados (Gmail)</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleAdd} className="form-grid" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label>Correo Gmail</label>
            <input
              type="email"
              required
              placeholder="nombre@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Nombre (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Juan (Portero)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="portero">Portero (Solo lectura)</option>
              <option value="admin">Administrador (Carga y edita)</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : '+ Autorizar correo'}
            </button>
          </div>
        </form>

        {initialAdmins.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#5a6578', marginBottom: 10 }}>
            <strong>Admins fijos (configurados en Vercel):</strong> {initialAdmins.join(', ')}
          </div>
        )}

        {loading ? (
          <p>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: '#5a6578' }}>
            AÃºn no agregaste usuarios adicionales desde este panel.
          </p>
        ) : (
          <div className="users-list">
            {users.map((u) => (
              <div key={u.id} className="user-row">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {u.email} {u.name ? `(${u.name})` : ''}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#5a6578' }}>
                    Rol: {u.role === 'admin' ? 'Administrador' : 'Portero (Solo lectura)'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => handleDelete(u.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}