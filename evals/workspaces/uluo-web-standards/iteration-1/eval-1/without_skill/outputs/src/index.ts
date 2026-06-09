import express from 'express';
import routes from './routes/index';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ─── Global Middleware ──────────────────────────────────────────

/** Parse JSON request bodies. */
app.use(express.json());

/** Parse URL-encoded request bodies. */
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────

app.use(routes);

// ─── Health Check ───────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'library-reservation-module',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ────────────────────────────────────────
// Must be registered after all routes.

app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info(`Library Reservation Module started`, { port: PORT });
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
  logger.info(`Search books: GET http://localhost:${PORT}/api/books/search?query=typescript`);
  logger.info(`Reserve book: POST http://localhost:${PORT}/api/reservations`);
});

export default app;
