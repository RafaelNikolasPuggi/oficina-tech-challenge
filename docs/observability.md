# Observabilidade (Fase 3)

## O que já está instrumentado no código

| Item | Onde | Como |
|---|---|---|
| **APM / tracing** | [`src/tracer.ts`](../src/tracer.ts) | `dd-trace`, inicializado antes de qualquer outro import em `main.ts`. Auto-instrumenta HTTP, Express/Nest, `pg`/TypeORM. Ligado via `DD_TRACE_ENABLED=true` (desligado por padrão — dev local e CI não tentam falar com um agent inexistente). |
| **Logs estruturados (JSON)** | [`src/shared/logging/json-logger.service.ts`](../src/shared/logging/json-logger.service.ts) | Usa o suporte nativo do Nest (`ConsoleLoggerOptions.json: true`), estendido para incluir `requestId` e, quando o APM está ativo, `dd.trace_id`/`dd.span_id` — permite pular de um log direto para o trace correspondente no Datadog. |
| **Correlação de requisições** | [`src/shared/logging/request-id.middleware.ts`](../src/shared/logging/request-id.middleware.ts) | Reaproveita o header `x-request-id` recebido (ex.: do API Gateway) ou gera um novo; propaga via `AsyncLocalStorage` para todo log emitido durante aquela requisição, sem precisar passar o id manualmente por cada camada/serviço. |
| **Healthcheck** | `GET /health` ([`src/app.controller.ts`](../src/app.controller.ts)) | Usado pelas `readinessProbe`/`livenessProbe` do Kubernetes (`k8s-aws/03-deployment.yaml`) e pode ser monitorado externamente (uptime check). |
| **Métricas de infraestrutura** | [`k8s-aws/07-datadog-agent.yaml`](../k8s-aws/07-datadog-agent.yaml) | DaemonSet do Datadog Agent — CPU/memória por nó e por pod, healthchecks do cluster. |

## O que precisa ser configurado na conta Datadog (fora do código)

A criação de dashboards é feita na UI do Datadog — depende da conta do usuário, que
ainda será criada. Uma vez com a conta e o `DD_API_KEY` configurados (ver
`k8s-aws/07-datadog-agent.yaml` e o secret `github.com/.../settings/secrets` do
repositório principal, `DD_API_KEY`), configurar 4 widgets/dashboards:

1. **Volume diário de ordens de serviço** — `count` de chamadas a `POST
   /ordens-servico` (trace do `dd-trace`, tag `resource_name:POST /ordens-servico`),
   agrupado por dia.
2. **Tempo médio de execução por status** — a própria API já expõe isso em
   `GET /ordens-servico/metricas/tempo-medio`; alternativa direta no Datadog: duração
   média do span correspondente a cada transição de status (`iniciarDiagnostico`,
   `registrarDiagnostico`, `aprovarOrcamento`, `finalizar`), via custom span tags.
3. **Erros e falhas nas integrações** — filtro de logs por `level:error`, agrupado por
   `context` (ex.: `TypeOrmModule` para falhas de banco, `EmailService` para falhas de
   envio de e-mail — que já são logadas como `warn` sem derrubar a requisição).
4. **Latência das APIs** — painel padrão de APM (p50/p95/p99) por `resource_name`,
   automático a partir do `dd-trace`, sem configuração de código adicional.

## Alertas recomendados

- Healthcheck (`/health`) falhando por > 2 minutos.
- Taxa de erro (`level:error` nos logs) acima de um limiar por serviço.
- CPU do node group do EKS acima de 80% sustentado (sinal de que o HPA pode estar no
  teto de `maxReplicas` — ver [ADR 0005](adr/0005-hpa.md)).

## Por que Datadog (não New Relic)

Ambos atendem ao requisito ("Datadog ou New Relic — escolha livre"). Datadog foi
escolhido por ter um agente Kubernetes (DaemonSet) simples de aplicar via manifesto
puro (sem depender de Helm), e por `dd-trace` cobrir Node.js/NestJS/TypeORM/pg com
zero configuração manual de spans para os casos mais comuns.
