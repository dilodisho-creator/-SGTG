import { Pool, PoolConfig } from 'pg';
import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

function getDatabaseConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  const host = process.env.DB_HOST || process.env.PGHOST || 'db.ymwsmcailgatzmqnfkqh.supabase.co';
  const port = Number(process.env.DB_PORT || process.env.PGPORT || 5432);
  const database = process.env.DB_NAME || process.env.PGDATABASE || 'postgres';
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'SGTG@123SGTG';

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

export const pool = new Pool(getDatabaseConfig());

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export async function initDb(): Promise<void> {
  console.log('Conectando e inicializando tablas en PostgreSQL...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_registry (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id         TEXT PRIMARY KEY,
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users_store (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS backups (
      id         TEXT PRIMARY KEY,
      filename   TEXT NOT NULL,
      data       JSONB NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await seedFromLocalFiles();
  console.log('Base de datos inicializada y lista.');
}

async function seedFromLocalFiles(): Promise<void> {
  try {
    const dataDir = path.resolve(__dirname, '..', 'data');
    if (!existsSync(dataDir)) return;

    const registryCheck = await pool.query(`SELECT 1 FROM tournament_registry WHERE key = 'registry'`);
    const tournamentsJsonPath = path.join(dataDir, 'tournaments.json');

    if (registryCheck.rows.length === 0 && existsSync(tournamentsJsonPath)) {
      try {
        const registryContent = JSON.parse(readFileSync(tournamentsJsonPath, 'utf8'));
        await pool.query(
          `INSERT INTO tournament_registry (key, value, updated_at)
           VALUES ('registry', $1::jsonb, NOW())
           ON CONFLICT (key) DO NOTHING`,
          [JSON.stringify(registryContent)],
        );
        console.log('Registro de torneos inicial importado a PostgreSQL.');
      } catch (err) {
        console.warn('No se pudo importar tournaments.json:', err);
      }
    }

    const tournamentsDir = path.join(dataDir, 'tournaments');
    if (existsSync(tournamentsDir)) {
      const files = readdirSync(tournamentsDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const id = path.basename(file, '.json');
        const check = await pool.query(`SELECT 1 FROM tournaments WHERE id = $1`, [id]);
        if (check.rows.length === 0) {
          try {
            const tournamentData = JSON.parse(readFileSync(path.join(tournamentsDir, file), 'utf8'));
            await pool.query(
              `INSERT INTO tournaments (id, data, created_at, updated_at)
               VALUES ($1, $2::jsonb, NOW(), NOW())
               ON CONFLICT (id) DO NOTHING`,
              [id, JSON.stringify(tournamentData)],
            );
            console.log(`Torneo ${id} importado a PostgreSQL.`);
          } catch (err) {
            console.warn(`Error al importar torneo ${file}:`, err);
          }
        }
      }
    }

    const singleTournamentPath = path.join(dataDir, 'tournament.json');
    if (existsSync(singleTournamentPath)) {
      const regRes = await pool.query<{ value: { activoId?: string } }>(
        `SELECT value FROM tournament_registry WHERE key = 'registry'`,
      );
      const activeId = regRes.rows[0]?.value?.activoId;
      if (activeId) {
        const check = await pool.query(`SELECT 1 FROM tournaments WHERE id = $1`, [activeId]);
        if (check.rows.length === 0) {
          try {
            const tournamentData = JSON.parse(readFileSync(singleTournamentPath, 'utf8'));
            await pool.query(
              `INSERT INTO tournaments (id, data, created_at, updated_at)
               VALUES ($1, $2::jsonb, NOW(), NOW())
               ON CONFLICT (id) DO NOTHING`,
              [activeId, JSON.stringify(tournamentData)],
            );
            console.log(`Torneo activo (${activeId}) importado a PostgreSQL desde tournament.json.`);
          } catch (err) {
            console.warn('Error al importar tournament.json:', err);
          }
        }
      }
    }

    const usersCheck = await pool.query(`SELECT 1 FROM users_store WHERE key = 'store'`);
    const usersJsonPath = path.join(dataDir, 'users.json');

    if (usersCheck.rows.length === 0 && existsSync(usersJsonPath)) {
      try {
        const usersContent = JSON.parse(readFileSync(usersJsonPath, 'utf8'));
        await pool.query(
          `INSERT INTO users_store (key, value, updated_at)
           VALUES ('store', $1::jsonb, NOW())
           ON CONFLICT (key) DO NOTHING`,
          [JSON.stringify(usersContent)],
        );
        console.log('Usuarios y roles iniciales importados a PostgreSQL.');
      } catch (err) {
        console.warn('No se pudo importar users.json:', err);
      }
    }
  } catch (err) {
    console.warn('Advertencia en seedFromLocalFiles:', err);
  }
}
