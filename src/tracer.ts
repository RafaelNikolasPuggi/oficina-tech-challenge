/**
 * Inicialização do Datadog APM (Fase 3 — observabilidade). Precisa ser o
 * PRIMEIRO import de `main.ts` para que a auto-instrumentação (HTTP,
 * Express/Nest, TypeORM/pg, etc.) consiga interceptar os módulos antes de
 * serem carregados.
 *
 * Fica desligado por padrão (`DD_TRACE_ENABLED` não definido) — dev local e
 * CI não tentam abrir conexão com um agent que não existe.
 */
if (process.env.DD_TRACE_ENABLED === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tracer = require('dd-trace') as typeof import('dd-trace');
  tracer.init({
    service: process.env.DD_SERVICE ?? 'oficina-tech-challenge',
    env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'development',
    logInjection: true, // injeta trace_id/span_id nos logs estruturados
  });
}
