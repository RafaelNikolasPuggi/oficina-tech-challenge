import { AsyncLocalStorage } from 'async_hooks';
import { ConsoleLogger, Injectable } from '@nestjs/common';

/** Guarda o id de correlação da requisição atual entre chamadas assíncronas. */
export const requestIdStorage = new AsyncLocalStorage<string>();

/**
 * Logger estruturado em JSON (um objeto por linha via `ConsoleLoggerOptions.json`,
 * suporte nativo do Nest), exigido pela Fase 3 para permitir correlação de
 * requisições e ingestão por ferramentas de observabilidade (Datadog). Quando
 * o APM está ativo (`DD_TRACE_ENABLED`), cada linha carrega
 * `dd.trace_id`/`dd.span_id`, permitindo pular de um log para o trace
 * correspondente no Datadog.
 */
@Injectable()
export class JsonLoggerService extends ConsoleLogger {
  constructor() {
    super({ json: true });
  }

  protected getJsonLogObject(
    message: unknown,
    options: Parameters<ConsoleLogger['getJsonLogObject']>[1],
  ): ReturnType<ConsoleLogger['getJsonLogObject']> & Record<string, unknown> {
    const logObject: ReturnType<ConsoleLogger['getJsonLogObject']> &
      Record<string, unknown> = super.getJsonLogObject(message, options);

    const requestId = requestIdStorage.getStore();
    if (requestId) logObject.requestId = requestId;

    if (process.env.DD_TRACE_ENABLED === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tracer = require('dd-trace') as typeof import('dd-trace');
      const span = tracer.scope().active();
      if (span) {
        const context = span.context();
        logObject['dd.trace_id'] = context.toTraceId();
        logObject['dd.span_id'] = context.toSpanId();
      }
    }

    return logObject;
  }
}
