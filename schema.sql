-- Ejecutar esto en el "Query" / editor SQL de tu base de datos
-- Vercel Postgres (pestaña "Storage" -> tu base -> "Data" o "Query").

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Suscripciones push de cada portero (una fila por dispositivo/navegador)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email ON push_subscriptions(email);

-- Historial de eventos cargados (referencia interna; la app no lo muestra)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,              -- 'entrada_tarde' | 'salida_anticipada' | 'salida_educativa'
  nivel TEXT NOT NULL,             -- 'Inicial' | 'Primario' | 'Secundario'
  curso TEXT,
  fecha DATE NOT NULL,
  hora_salida TIME NOT NULL,
  hora_regreso TIME,
  destino TEXT,
  observaciones TEXT,
  cargado_por TEXT NOT NULL,       -- email del administrador
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
