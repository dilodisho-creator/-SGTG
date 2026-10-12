import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { initDb } from './db';

async function start(): Promise<void> {
  await initDb();

  app.listen(config.port, () => {
    console.log(`Sistema simple disponible en http://localhost:${config.port}`);
  });
}

void start().catch((error) => {
  console.error('No se pudo iniciar el servidor.', error);
  process.exit(1);
});
