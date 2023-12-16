import 'dotenv/config';
import { createServer } from './utils/server.js';
import { disconnectConsumer, connectConsumer } from './utils/kafka.js';
import sendNotification from './utils/sendNotification.js';
import * as AlertModels from './utils/checkAlertRules.js';

const PORT = process.env.PORT;

async function gracefulShutdown(app) {
  console.log('Graceful shutdown');

  await app.close();
  await disconnectConsumer();

  process.exit(1);
}

async function main() {
  const app = await createServer();

  const emitter = await connectConsumer('notification');
  emitter.on('message', async ruleId => {
    const client = await app.pg.connect();
    try {
      await client.query('BEGIN');
      const alert = await AlertModels.getAlertRule(client, ruleId);
      const { filter, action_interval: actionInterval, project_id: projectId } = alert;

      const triggers = await AlertModels.getTriggers(client, ruleId);

      const issuesInterval = await AlertModels.getIssues(client, +projectId, actionInterval);
      console.log(triggers, issuesInterval);
      let isFire = false;
      for (let i = 0; i < triggers.length; i++) {
        if (+triggers[i].trigger_type_id === 1) {
          if (issuesInterval.issue.length > 0) isFire = true;
        } else {
          const t = await AlertModels.getIssues(client, +projectId, triggers[i].time_window);
          if (t.find(el => +el.event_num > +triggers[i].threshold)) isFire = true;
        }

        if (filter === 'any') break;
      }

      if (isFire) {
        const tokens = await AlertModels.getTokens(client, ruleId);
        const historyRes = await AlertModels.createAlertHistory(client, ruleId);
        await sendNotification('出事了阿伯', tokens);
      }
      client.query('COMMIT');
    } catch (err) {
      console.error(err);
      client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  app.listen({
    port: PORT,
  });

  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach(signal => {
    process.on(signal, () => gracefulShutdown(app));
  });

  console.log(`Notification service ready at http://localhost:${PORT}`);
}

main();
