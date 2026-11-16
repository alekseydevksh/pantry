import { createServer } from 'node:http';

import { createApp } from './app';
import { readConfig } from './config';

const config = readConfig();
const app = createApp(config.app);

// 0.0.0.0, so a simulator, an emulator or a phone on the same network can reach it.
createServer(app).listen(config.port, '0.0.0.0', () => {
  const { delayMs, errorRate } = config.app;
  console.log(`Pantry mock API: http://localhost:${config.port}${app.graphqlEndpoint}`);
  console.log(
    `  delay: ${delayMs ? `${delayMs.min}–${delayMs.max} ms` : 'off'}, error rate: ${errorRate ?? 0}`,
  );
});
