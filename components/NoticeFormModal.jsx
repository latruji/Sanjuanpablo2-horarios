'use client';

import { useState, useEffect } from 'react';
import { LEVELS, NOTICE_TYPES, getTodayArgentina } from '@/lib/constants';

export default function NoticeFormModal({ initialNotice, onClose, onSaved }) {
  const isEditing = Boolean(initialNotice);
  const today = getTodayArgentina();

  const [type, setType] = useState(initialNotice?.type || 'entrada_tarde');
  const [level, setLevel] = useState(initialNotice?.level || 'Secundario');
  const [turn, setTurn] = useState(initialNotice?.turn || 'MaÃ±ana');
  const [courses, setCourses] = useState(initialNotice?.courses || []);
  const [eventDate, setEventDate] = useState(initialNotice?.event_date || today);
  const [startTime, setStartTime] = useState(initialNotice?.start_time || '08:30');
  const [returnDate, setReturnDate] = useState(initialNotice?.return_date || today);
  const [returnTime, setReturnTime] = useState(initialNotice?.return_time || '12:00');
  const [destination, setDestination] = useState(initialNotice?.destination || '');
  const [teachers, setTeachers] = useState(initialNotice?.teachers || '');
  const [transport, setTransport] = useState(initialNotice?.transport || '');
  const [notes, setNotes] = useState(initialNotice?.notes || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const allowed = NOTICE_TYPES[type].allowedLevels;
    if (!allowed.includes(level)) {
      setLevel(allowed[0]);
      setTurn('MaÃ±ana');
      setCourses([]);
    }
  }, [type, level]);

  const availableTurns = Object.keys(LEVELS[level]?.turns || {});
  const availableCourses = LEVELS[level]?.turns[turn] || [];

  function handleLevelChange(newLevel) {
    setLevel(newLevel);
    const turns = Object.keys(LEVELS[newLevel].turns);
    setTurn(turns[0]);
    setCourses([]);
  }

  function handleTurnChange(newTurn) {
    setTurn(newTurn);
    setCourses([]);
  }

  function toggleCourse(course) {
    setCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (courses.length === 0) {
      setError('Selecciona al menos un curso o sala.');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/notices/${initialNotice.id}` : '/api/notices';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          level,
          turn,
          courses,
          event_date: eventDate,
          start_time: startTime,
          return_date: type === 'salida_educativa' ? returnDate : null,
          return_time: type === 'salida_educativa' ? returnTime : null,
          destination,
          teachers,
          transport,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el aviso.');
        setSaving(false);
        return;
      }

      onSaved(data.notice);
    } catch {
      setError('Error de conexiÃ³n al guardar.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{isEditing ? 'Editar aviso' : 'Nuevo aviso para PorterÃ­a'}</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Tipo de aviso</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(NOTICE_TYPES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} {meta.allowedLevels.length === 1 ? '(Solo Secundario)' : '(3 Niveles)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Nivel</label>
              <select value={level} onChange={(e) => handleLevelChange(e.target.value)}>
                {NOTICE_TYPES[type].allowedLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {LEVELS[lvl].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Turno</label>
              <select value={turn} onChange={(e) => handleTurnChange(e.target.value)}>
                {availableTurns.map((t) => (
                  <option key={t} value={t}>
                    Turno {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label>Curso(s) / Sala(s)</label>
              <div className="courses-chips">
                {availableCourses.map((course) => {
                  const selected = courses.includes(course);
                  return (
                    <button
                      type="button"
                      key={course}
                      className={`course-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleCourse(course)}
                    >
                      {selected ? 'âœ“ ' : ''}
                      {course}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>{type === 'salida_educativa' ? 'Fecha de salida' : 'Fecha'}</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  if (!isEditing && returnDate < e.target.value) {
                    setReturnDate(e.target.value);
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>
                {type === 'entrada_tarde'
                  ? 'Hora nueva de entrada'
                  : type === 'salida_anticipada'
                  ? 'Hora de salida anticipada'
                  : 'Hora de salida'}
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {type === 'salida_educativa' && (
              <>
                <div className="form-group">
                  <label>Fecha estimada de regreso</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Hora estimada de regreso</label>
                  <input
                    type="time"
                    required
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                  />
                </div>

                <div className="form-group full">
                  <label>Destino / Actividad</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Museo de Ciencias / Granja Educativa"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Docentes responsables</label>
                  <input
                    type="text"
                    placeholder="Ej: Prof. GarcÃ­a, Prof. LÃ³pez"
                    value={teachers}
                    onChange={(e) => setTeachers(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Transporte / Micro (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Empresa Sur / Micro patente..."
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group full">
              <label>Observaciones para porterÃ­a (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ej: Ingresan por portÃ³n lateral / Sin docente en 1Âª hora"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando y subiendo a Calendar...' : isEditing ? 'Guardar cambios' : 'Publicar y subir a Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}