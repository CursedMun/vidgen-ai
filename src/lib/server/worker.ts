// src/lib/server/worker.ts

import cron from 'node-cron';
import { initCore } from '.';
import { AutomationWorker } from './AutomationWorker';

async function startWorker() {
  // 1. Inicializa todos os serviços (AI, DB, APIs) de uma vez
  const { services, db } = await initCore();

  // 2. Instancia o AutomationWorker com os serviços prontos
  const worker = new AutomationWorker(
    db,
    services.transcriber,
    services.video,
    services.youtube,
    services.instagram
  );

  console.log("Worker em execução...");

  // 3. O Loop do Cron
  cron.schedule('* * * * *', async () => {
    console.log("🔍 Verificando tarefas pendentes...");
    await worker.processPendingCrons();
  });
}

startWorker().catch(console.error);