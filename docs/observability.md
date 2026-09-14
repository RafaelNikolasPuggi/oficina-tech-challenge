# Observabilidade (Fase 3)

## O que já está instrumentado no código

| Item | Onde | Como |
|---|---|---|
| **APM / tracing** | [`src/tracer.ts`](../src/tracer.ts) | Agente Node.js do **New Relic**, inicializado antes de qualquer outro import em `main.ts`. Auto-instrumenta HTTP, Express/Nest, `pg`/TypeORM. Ligado via `NEW_RELIC_ENABLED=true` (desligado por padrão — dev local e CI não tentam se conectar a uma conta inexistente). Configuração inteiramente por variáveis de ambiente (`NEW_RELIC_NO_CONFIG_FILE=true`), sem arquivo `newrelic.js` no repositório. |
| **Logs estruturados (JSON)** | [`src/shared/logging/json-logger.service.ts`](../src/shared/logging/json-logger.service.ts) | Usa o suporte nativo do Nest (`ConsoleLoggerOptions.json: true`), estendido para incluir `requestId` e, quando o APM está ativo, `trace.id`/`span.id`/`entity.guid` via `newrelic.getLinkingMetadata()` — o formato que o New Relic espera para linkar log ↔ trace automaticamente na UI. |
| **Correlação de requisições** | [`src/shared/logging/request-id.middleware.ts`](../src/shared/logging/request-id.middleware.ts) | Reaproveita o header `x-request-id` recebido (ex.: do API Gateway) ou gera um novo; propaga via `AsyncLocalStorage` para todo log emitido durante aquela requisição, sem precisar passar o id manualmente por cada camada/serviço. |
| **Healthcheck** | `GET /health` ([`src/app.controller.ts`](../src/app.controller.ts)) | Usado pelas `readinessProbe`/`livenessProbe` do Kubernetes (`k8s-aws/03-deployment.yaml`) e monitorado como uptime check sintético no New Relic. |
| **Métricas de infraestrutura + logs do cluster** | `helm upgrade --install newrelic-bundle newrelic/nri-bundle` (ver `.github/workflows/ci-cd.yml`, job `deploy-eks`) | Chart oficial do New Relic para Kubernetes: `newrelic-infrastructure` (CPU/memória por nó e por pod, healthchecks) + `kube-state-metrics` (estado dos objetos do cluster) + `newrelic-logging` (Fluent Bit, encaminha stdout de todos os containers do namespace para os Logs do New Relic). |

## O que precisa ser configurado na conta New Relic (fora do código)

A criação de dashboards é feita na UI do New Relic — depende da conta do usuário. Com a
conta criada e o secret `NEW_RELIC_LICENSE_KEY` configurado no repositório (chave do
tipo **Ingest - License**, não *User key*), o pipeline já instala o agente da
aplicação e a integração de Kubernetes automaticamente a cada deploy. Falta configurar,
na UI, 4 widgets/dashboards:

1. **Volume diário de ordens de serviço** — `count` de transações a `POST
   /ordens-servico` (APM → Transactions, filtro `request.method = 'POST' AND
   request.uri = '/ordens-servico'`), agrupado por dia (NRQL: `SELECT count(*) FROM
   Transaction WHERE name LIKE '%ordens-servico%' TIMESERIES 1 day`).
2. **Tempo médio de execução por status** — a própria API já expõe isso em
   `GET /ordens-servico/metricas/tempo-medio`; alternativa direta no New Relic: duração
   média das transações correspondentes a cada transição de status
   (`iniciarDiagnostico`, `registrarDiagnostico`, `aprovarOrcamento`, `finalizar`), via
   `average(duration)` agrupado pelo nome da transação.
3. **Erros e falhas nas integrações** — Logs UI, filtro `level:"error"`, agrupado por
   `context` (ex.: `TypeOrmModule` para falhas de banco, `EmailService` para falhas de
   envio de e-mail — que já são logadas como `warn` sem derrubar a requisição).
4. **Latência das APIs** — painel padrão de APM (p50/p95/p99) por transação, automático
   a partir do agente Node.js, sem configuração de código adicional.

## Alertas recomendados (New Relic Alerts)

- Healthcheck (`/health`) falhando por > 2 minutos (synthetic monitor).
- Taxa de erro (`level:"error"` nos logs, ou error rate do APM) acima de um limiar.
- CPU do node group do EKS acima de 80% sustentado (sinal de que o HPA pode estar no
  teto de `maxReplicas` — ver [ADR 0005](adr/0005-hpa.md)), via
  `K8sContainerSample.cpuUsedCores` do `newrelic-infrastructure`.

## Por que New Relic (não Datadog)

Ambos atendem ao requisito ("Datadog ou New Relic — escolha livre"). New Relic foi a
opção escolhida porque foi a conta que ficou disponível para o projeto; tecnicamente a
troca foi direta — mesmo padrão de agente Node.js com auto-instrumentação HTTP/Nest/pg,
mesmo padrão de correlação log↔trace, e o chart oficial `nri-bundle` cobre a integração
de Kubernetes (métricas + logs) em uma única instalação via Helm.
