import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './logger';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes mounted here by other workstreams (see src/routes/)

app.listen(config.port, () => {
  logger.info(`AIScore API running on port ${config.port}`);
});

export default app;
