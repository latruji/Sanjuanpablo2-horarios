// Vercel Postgres se conecta solo con la variable de entorno POSTGRES_URL
// que Vercel agrega automáticamente al vincular la base de datos al proyecto.
export { sql } from "@vercel/postgres";