import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db';

import frameworksRouter from './routes/frameworks';
import goalsRouter from './routes/goals';
import sessionsRouter from './routes/sessions';
import journalsRouter from './routes/journals';
import failuresRouter from './routes/failures';
import usersRouter from './routes/users';
import progressRouter from './routes/progress';
import questionsRouter from './routes/questions';
import exportRouter from './routes/export';
import trashRouter from './routes/trash';
import { errorHandler, notFound } from './middleware/errorHandler';
import { clientTimezoneMiddleware } from './middleware/clientTimezone';

const app = express();
const PORT = process.env['PORT'] ?? 3001;

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use('/api', clientTimezoneMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ---- Health Check ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/frameworks', frameworksRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/failures', failuresRouter);
app.use('/api/users', usersRouter);
app.use('/api/progress', progressRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/export', exportRouter);
app.use('/api/trash', trashRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server after DB is ready
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Productivity API running at http://localhost:${PORT}`);
    console.log('   Available routes:');
    console.log('   GET  /api/health');
    console.log('   CRUD /api/frameworks');
    console.log('   CRUD /api/goals');
    console.log('   CRUD /api/sessions');
    console.log('   CRUD /api/journals');
    console.log('   CRUD /api/failures');
    console.log('   CRUD /api/users');
    console.log('   GET  /api/progress/summary');
    console.log('   CRUD /api/questions');
    console.log('   GET  /api/export\n');
  });
}).catch((err: Error) => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});

export default app;
