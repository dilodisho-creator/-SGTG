import path from 'node:path';

const backendRoot = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 58310),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:58311',
  dataFile: path.resolve(backendRoot, 'data', 'tournament.json'),
  tournamentRegistryFile: path.resolve(backendRoot, 'data', 'tournaments.json'),
  tournamentsDirectory: path.resolve(backendRoot, 'data', 'tournaments'),
  backupDirectory: path.resolve(backendRoot, '..', 'data', 'backups'),
};