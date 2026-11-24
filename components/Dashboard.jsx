'use client';

import { useState, useEffect, useMemo } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { NOTICE_TYPES, formatDateAR, getTodayArgentina } from '@/lib/constants';
import NoticeFormModal from './NoticeFormModal';
import UsersModal from './UsersModal';

export default function Dashboard({ session, calendarUrl }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [levelFilter, setLevelFilter] = useState('all');
  const [turnFilter, setTurnFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [showUsers, setShowUsers] = useState(false);

  const user = session?.user;
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isAuthorized = role === 'admin' || role === 'portero';
  const today = getTodayArgentina();

  async function fetchNotices() {
    setLoading(true);
    try {
      const res = await fetch('/api/notices');
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      fetchNotices();
    }
  }, [isAuthorized]);

  const todayCount = useMemo(
    () => notices.filter((n) => n.event_date === today).length,
    [notices, today]
  );
  const tripsTodayCount = useMemo(
    () => notices.filter((n) => n.event_date === today && n.type === 'salida_educativa').length,
    [notices, today]
  );
  const upcomingCount = useMemo(
    () => notices.filter((n) => n.event_date > today).length,
    [notices, today]
  );

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (tab === 'today' && n.event_date !== today) return false;
      if (tab === 'upcoming' && n.event_date < today) return false;
      if (tab === 'history' && n.event_date >= today) return false;
      if (levelFilter !== 'all' && n.level !== levelFilter) return false;
      if (turnFilter !== 'all' && n.turn !== turnFilter) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      return true;
    });
  }, [notices, tab, today, levelFilter, turnFilter, typeFilter]);

  const groupedByDate = useMemo(() => {
    const map = new Map();
    const list = tab === 'history' ? [...filteredNotices].reverse() : filteredNotices;
    for (const item of list) {
      if (!map.has(item.event_date)) map.set(item.event_date, []);
      map.get(item.event_date).push(item);
    }
    return Array.from(map.entries());
  }, [filteredNotices, tab]);

  async function handleDelete(notice) {
    if (!confirm(`Â¿Eliminar este aviso (${notice.courses.join(', ')})? TambiÃ©n se quitarÃ¡ de Google Calendar.`)) {
      return;
    }
    const res = await fetch(`/api/notices/${notice.id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotices((prev) => prev.filter((n) => n.id !== notice.id));
    }
  }

  if (!session) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <img src="/logo.png" alt="Instituto San Juan Pablo II" />
          <h2>Instituto San Juan Pablo II</h2>
          <p>Sistema de informaciÃ³n para PorterÃ­a: cambios de horarios y salidas educativas.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 16px' }}
            onClick={() => signIn('google')}
          >
            Ingresar con Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <img src="/logo.png" alt="Instituto San Juan Pablo II" />
          <h2>Acceso pendiente de autorizaciÃ³n</h2>
          <p>
            Ingresaste con <strong>{user.email}</strong>, pero tu cuenta todavÃ­a no estÃ¡ habilitada como
            Administrador o Portero. Solicita a DirecciÃ³n/AdministraciÃ³n que agregue tu correo.
          </p>
          <button type="button" className="btn btn-outline" onClick={() => signOut()}>
            Cerrar sesiÃ³n
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/logo.png" alt="Escudo" className="brand-logo" />
            <div>
              <h1>Instituto San Juan Pablo II</h1>
              <p>InformaciÃ³n de PorterÃ­a y Salidas Educativas</p>
            </div>
          </div>

          <div className="user-actions">
            <span className={`role-pill ${isAdmin ? 'role-admin' : 'role-portero'}`}>
              {isAdmin ? 'Administrador' : 'PorterÃ­a (Solo lectura)'}
            </span>

            {calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost-white btn-sm"
              >
                Ver Google Calendar
              </a>
            )}

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost-white btn-sm"
                  onClick={() => setShowUsers(true)}
                >
                  Usuarios
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => {
                    setEditingNotice(null);
                    setShowForm(true);
                  }}
                >
                  + Nuevo Aviso
                </button>
              </>
            )}

            <button
              type="button"
              className="btn btn-ghost-white btn-sm"
              onClick={() => signOut()}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="stats-grid">
          <div className="stat-card stat-today">
            <div className="stat-value">{todayCount}</div>
            <div className="stat-label">Avisos para HOY</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{tripsTodayCount}</div>
            <div className="stat-label">Salidas educativas HOY</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{upcomingCount}</div>
            <div className="stat-label">PrÃ³ximos dÃ­as programados</div>
          </div>
        </section>

        <section className="toolbar">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${tab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Hoy y PrÃ³ximos
            </button>
            <button
              type="button"
              className={`tab ${tab === 'today' ? 'active' : ''}`}
              onClick={() => setTab('today')}
            >
              Solo Hoy ({todayCount})
            </button>
            <button
              type="button"
              className={`tab ${tab === 'history' ? 'active' : ''}`}
              onClick={() => setTab('history')}
            >
              Pasados
            </button>
          </div>

          <div className="filters">
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="all">Todos los niveles</option>
              <option value="Inicial">Inicial</option>
              <option value="Primario">Primario</option>
              <option value="Secundario">Secundario</option>
            </select>

            <select value={turnFilter} onChange={(e) => setTurnFilter(e.target.value)}>
              <option value="all">Ambos turnos</option>
              <option value="MaÃ±ana">Turno MaÃ±ana</option>
              <option value="Tarde">Turno Tarde</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos los tipos</option>
              <option value="entrada_tarde">Entrada Tarde</option>
              <option value="salida_anticipada">Salida Anticipada</option>
              <option value="salida_educativa">Salida Educativa</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="empty-state">Cargando avisos...</div>
        ) : groupedByDate.length === 0 ? (
          <div className="empty-state">
            No hay avisos para mostrar en esta vista.
          </div>
        ) : (
          groupedByDate.map(([dateStr, items]) => {
            const isToday = dateStr === today;
            return (
              <section key={dateStr} className="day-group">
                <div className="day-header">
                  {isToday && <span className="hoy-pill">HOY</span>}
                  <h3>{formatDateAR(dateStr)}</h3>
                </div>

                <div className="notices-grid">
                  {items.map((n) => {
                    const meta = NOTICE_TYPES[n.type] || {};
                    return (
                      <article key={n.id} className={`notice-card ${isToday ? 'is-today' : ''}`}>
                        <div className="notice-top">
                          <span className={`badge ${meta.badgeClass || 'badge-primary'}`}>
                            {meta.shortLabel || n.type}
                          </span>
                          <span className="level-tag">
                            {n.level} Â· Turno {n.turn}
                          </span>
                        </div>

                        <div className="notice-courses">{n.courses.join(', ')}</div>

                        <div className="notice-time-box">
                          {n.type === 'entrada_tarde' && `Ingresan a las ${n.start_time} hs`}
                          {n.type === 'salida_anticipada' && `Se retiran a las ${n.start_time} hs`}
                          {n.type === 'salida_educativa' && (
                            <>
                              Salida: {n.start_time} hs
                              {n.return_time
                                ? ` Â· Regreso: ${n.return_date && n.return_date !== n.event_date ? `${n.return_date} ` : ''}${n.return_time} hs`
                                : ''}
                            </>
                          )}
                        </div>

                        <div className="notice-meta">
                          {n.destination && (
                            <div>
                              <strong>Destino:</strong> {n.destination}
                            </div>
                          )}
                          {n.teachers && (
                            <div>
                              <strong>Docentes:</strong> {n.teachers}
                            </div>
                          )}
                          {n.transport && (
                            <div>
                              <strong>Transporte:</strong> {n.transport}
                            </div>
                          )}
                          {n.notes && (
                            <div>
                              <strong>Obs:</strong> {n.notes}
                            </div>
                          )}
                        </div>

                        <div className="notice-footer">
                          <span className={`cal-status ${n.google_event_id ? 'cal-ok' : 'cal-err'}`}>
                            {n.google_event_id
                              ? 'âœ“ En Google Calendar'
                              : n.calendar_error
                              ? `Sin Calendar (${n.calendar_error})`
                              : 'Sin sincronizar'}
                          </span>

                          {isAdmin && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setEditingNotice(n);
                                  setShowForm(true);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger-outline btn-sm"
                                onClick={() => handleDelete(n)}
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {showForm && (
        <NoticeFormModal
          initialNotice={editingNotice}
          onClose={() => {
            setShowForm(false);
            setEditingNotice(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingNotice(null);
            fetchNotices();
          }}
        />
      )}

      {showUsers && <UsersModal onClose={() => setShowUsers(false)} />}
    </div>
  );
}