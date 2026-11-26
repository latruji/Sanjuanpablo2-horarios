import { sql } from '@vercel/postgres';

let tablesReadyPromise = null;

export async function ensureTables() {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) DEFAULT '',
          role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'portero')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS notices (
          id SERIAL PRIMARY KEY,
          type VARCHAR(40) NOT NULL,
          level VARCHAR(30) NOT NULL,
          turn VARCHAR(20) NOT NULL,
          courses TEXT NOT NULL,
          event_date VARCHAR(10) NOT NULL,
          start_time VARCHAR(5) NOT NULL,
          return_date VARCHAR(10),
          return_time VARCHAR(5),
          destination VARCHAR(255) DEFAULT '',
          teachers VARCHAR(255) DEFAULT '',
          transport VARCHAR(255) DEFAULT '',
          notes TEXT DEFAULT '',
          google_event_id VARCHAR(255),
          calendar_id VARCHAR(255),
          calendar_error TEXT DEFAULT '',
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
    })().catch((err) => {
      tablesReadyPromise = null;
      throw err;
    });
  }
  return tablesReadyPromise;
}

export function getInitialAdminEmails() {
  const raw = process.env.INITIAL_ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getUserRole(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();

  if (getInitialAdminEmails().includes(normalized)) {
    return 'admin';
  }

  await ensureTables();
  const { rows } = await sql`
    SELECT role FROM users WHERE LOWER(email) = ${normalized} LIMIT 1;
  `;
  return rows[0]?.role || null;
}

export async function listUsers() {
  await ensureTables();
  const { rows } = await sql`
    SELECT id, email, name, role, created_at
    FROM users
    ORDER BY role ASC, email ASC;
  `;
  return rows;
}

export async function upsertUser({ email, name = '', role }) {
  await ensureTables();
  const normalized = email.trim().toLowerCase();
  const { rows } = await sql`
    INSERT INTO users (email, name, role)
    VALUES (${normalized}, ${name.trim()}, ${role})
    ON CONFLICT (email)
    DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    RETURNING id, email, name, role, created_at;
  `;
  return rows[0];
}

export async function deleteUserById(id) {
  await ensureTables();
  await sql`DELETE FROM users WHERE id = ${id};`;
}

function parseNoticeRow(row) {
  let courses = [];
  try {
    courses = JSON.parse(row.courses);
  } catch {
    courses = row.courses ? [row.courses] : [];
  }
  return { ...row, courses };
}

export async function listNotices() {
  await ensureTables();
  const { rows } = await sql`
    SELECT * FROM notices
    ORDER BY event_date ASC, start_time ASC, id DESC;
  `;
  return rows.map(parseNoticeRow);
}

export async function getNoticeById(id) {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM notices WHERE id = ${id} LIMIT 1;`;
  return rows[0] ? parseNoticeRow(rows[0]) : null;
}

export async function createNotice(data) {
  await ensureTables();
  const coursesJson = JSON.stringify(data.courses || []);
  const { rows } = await sql`
    INSERT INTO notices (
      type, level, turn, courses, event_date, start_time,
      return_date, return_time, destination, teachers, transport, notes,
      google_event_id, calendar_id, calendar_error, created_by
    ) VALUES (
      ${data.type}, ${data.level}, ${data.turn}, ${coursesJson},
      ${data.event_date}, ${data.start_time}, ${data.return_date || null},
      ${data.return_time || null}, ${data.destination || ''},
      ${data.teachers || ''}, ${data.transport || ''}, ${data.notes || ''},
      ${data.google_event_id || null}, ${data.calendar_id || null},
      ${data.calendar_error || ''}, ${data.created_by}
    )
    RETURNING *;
  `;
  return parseNoticeRow(rows[0]);
}

export async function updateNotice(id, data) {
  await ensureTables();
  const coursesJson = JSON.stringify(data.courses || []);
  const { rows } = await sql`
    UPDATE notices SET
      type = ${data.type},
      level = ${data.level},
      turn = ${data.turn},
      courses = ${coursesJson},
      event_date = ${data.event_date},
      start_time = ${data.start_time},
      return_date = ${data.return_date || null},
      return_time = ${data.return_time || null},
      destination = ${data.destination || ''},
      teachers = ${data.teachers || ''},
      transport = ${data.transport || ''},
      notes = ${data.notes || ''},
      google_event_id = ${data.google_event_id ?? null},
      calendar_id = ${data.calendar_id ?? null},
      calendar_error = ${data.calendar_error || ''},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0] ? parseNoticeRow(rows[0]) : null;
}

export async function deleteNoticeById(id) {
  await ensureTables();
  await sql`DELETE FROM notices WHERE id = ${id};`;
}