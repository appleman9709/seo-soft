import Fastify from 'fastify';
import { module1Routes } from './routes/module1.js';

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(module1Routes, { prefix: '/api/v1/module1' });
  return app;
}
