# Observabilidade (Fase 3)

## O que está instrumentado no código

| Item | Onde | Como |
|---|---|---|
| **APM / tracing** | [`src/tracer.ts`](../src/tracer.ts) | Agente Node.js do **New Relic**, inicializado antes de qualquer outro import em `main.ts`. Auto-instrumenta HTTP, Express/Nest, `pg`/TypeORM. Ligado via `NEW_RELIC_ENABLED=true`. Configuração inteiramente por variáveis de ambiente (`NEW_RELIC_NO_CONFIG_FILE=true`), sem arquivo `newrelic.js` no repositório. |
| **Logs estruturados (JSON)** | [`src/shared/logging/json-logger.service.ts`](../src/shared/logging/json-logger.service.ts) | Usa o suporte nativo do Nest (`ConsoleLoggerOptions.json: true`), estendido para incluir `requestId` e, quando o APM está ativo, `trace.id`/`span.id`/`entity.guid` via `newrelic.getLinkingMetadata()` — formato que o New Relic usa para linkar log ↔ trace automaticamente na UI. |
| **Correlação de requisições** | [`src/shared/logging/request-id.middleware.ts`](../src/shared/logging/request-id.middleware.ts) | Reaproveita o header `x-request-id` recebido (ex.: do API Gateway) ou gera um novo; propaga via `AsyncLocalStorage` para todo log emitido durante aquela requisição, sem precisar passar o id manualmente por cada camada/serviço. |
| **Healthcheck** | `GET /health` ([`src/app.controller.ts`](../src/app.controller.ts)) | Usado pelas `readinessProbe`/`livenessProbe` do Kubernetes (`k8s-aws/03-deployment.yaml`) e monitorado como uptime check sintético no New Relic. |
| **Métricas de infraestrutura + logs do cluster** | `helm upgrade --install newrelic-bundle newrelic/nri-bundle` (ver `.github/workflows/ci-cd.yml`, job `deploy-eks`) | Chart oficial do New Relic para Kubernetes: `newrelic-infrastructure` (CPU/memória por nó e por pod, healthchecks) + `kube-state-metrics` (estado dos objetos do cluster) + `newrelic-logging` (Fluent Bit, encaminha stdout de todos os containers do namespace para os Logs do New Relic). |

## Dashboards

Dashboard "FIAP" no New Relic:
https://one.newrelic.com/dashboards/detail/ODUxMDQ0MnxWSVp8REFTSEJPQVJEfGRhOjEzMTcwMjQ1?account=8510442

4 widgets:

| Widget | NRQL |
|---|---|
| Volume diário de ordens de serviço | `SELECT count(*) FROM Transaction WHERE appName = 'oficina-tech-challenge' AND name LIKE '%POST%ordens-servico%' TIMESERIES AUTO` |
| Tempo médio de execução por status | `SELECT average(duration) FROM Transaction WHERE appName = 'oficina-tech-challenge' AND name LIKE '%ordens-servico%' FACET name TIMESERIES` |
| Erros e falhas nas integrações | `SELECT count(*) FROM Log WHERE level = 'error' FACET context TIMESERIES` |
| Latência das APIs (p50/p95/p99) | `SELECT percentile(duration, 50, 95, 99) FROM Transaction WHERE appName = 'oficina-tech-challenge' TIMESERIES` |

Notas sobre as queries:
- `TIMESERIES AUTO` (em vez de um bucket fixo como `1 day`) deixa o New Relic escolher
  o tamanho do intervalo compatível com a janela de tempo selecionada no dashboard —
  um bucket fixo maior que a janela visível falha com
  `TIMESERIES step size is larger than the current time window`.
- O verbo HTTP não é filtrado via um atributo separado (`request.method`, que o agente
  Node não popula por padrão) — o nome da transação já inclui o verbo
  (`WebTransaction/Expressjs/POST//ordens-servico`), então o filtro fica embutido no
  próprio `name LIKE`.
- A latência (p50/p95/p99) também está disponível automaticamente na visão padrão de
  APM do New Relic, sem necessidade de dashboard customizado.
- O intervalo padrão do dashboard deve cobrir uma janela com volume de tráfego
  suficiente para os widgets baseados em `TIMESERIES 1 day`/`FACET` renderizarem pontos
  visíveis (recomendado: "Last 3 days" ou mais, configurado no seletor de tempo do
  próprio dashboard).

## Alertas configurados (New Relic Alerts)

- Healthcheck (`/health`) falhando por > 2 minutos (synthetic monitor).
- Taxa de erro (`level:"error"` nos logs, ou error rate do APM) acima de um limiar.
- CPU do node group do EKS acima de 80% sustentado (sinal de que o HPA pode estar no
  teto de `maxReplicas` — ver [ADR 0005](adr/0005-hpa.md)), via
  `K8sContainerSample.cpuUsedCores` do `newrelic-infrastructure`.

## Por que New Relic

Ver [ADR 0007](adr/0007-observabilidade-new-relic.md) para a justificativa completa.
Resumo: plataforma unificada (APM + logs + métricas de infra em uma única conta/UI),
integração de Kubernetes cobrindo métricas e logs em uma única instalação Helm
(`nri-bundle`), e NRQL como linguagem de consulta única para todos os dashboards e
alertas exigidos pelo desafio.
