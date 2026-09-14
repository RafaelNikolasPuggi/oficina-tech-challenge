# ADR 0007 — Observabilidade via New Relic (não Datadog)

**Status:** Aceito

## Contexto

A Fase 3 exige integração com uma ferramenta de observabilidade, com escolha livre
entre Datadog ou New Relic — ambos cobrem APM, logs estruturados e métricas de
infraestrutura com um nível de configuração comparável.

## Decisão

New Relic foi escolhido pelos seguintes fatores:

- **Plataforma unificada**: APM, logs, métricas de infraestrutura e dashboards em uma
  única conta/UI, sem precisar correlacionar dados entre produtos separados.
- **Integração de Kubernetes em uma instalação**: o chart oficial `nri-bundle` cobre
  métricas de nó/pod (`newrelic-infrastructure`), estado do cluster
  (`kube-state-metrics`) e encaminhamento de logs (`newrelic-logging`, via Fluent Bit)
  em um único `helm install`, sem precisar compor múltiplos agentes manualmente.
- **NRQL**: linguagem de consulta única para todos os tipos de dado (traces, logs,
  métricas de infra), o que simplifica a criação dos dashboards e alertas exigidos
  pelo desafio (volume de OS, tempo médio por status, erros de integração, latência).

Implementação:

- Agente Node.js do New Relic (`newrelic`) como APM — inicializado como primeiro
  import de `main.ts` ([`src/tracer.ts`](../../src/tracer.ts)), gated por
  `NEW_RELIC_ENABLED`, configurado só por variáveis de ambiente
  (`NEW_RELIC_NO_CONFIG_FILE=true`, sem arquivo de config commitado).
- `JsonLoggerService` usa `newrelic.getLinkingMetadata()` para injetar
  `trace.id`/`span.id`/`entity.guid` nos logs — permite pular de um log direto para o
  trace correspondente na UI do New Relic.
- Integração de Kubernetes via `nri-bundle` (Helm), instalada no job `deploy-eks`
  quando o secret `NEW_RELIC_LICENSE_KEY` está configurado no repositório.

## Consequências

- **Positivas:** uma única instrumentação cobre APM + logs + infraestrutura; `nri-bundle`
  elimina a necessidade de escrever/manter manifestos Kubernetes de agente à mão.
- **Negativas:** a instalação via Helm adiciona uma dependência (`azure/setup-helm`) ao
  pipeline; o repositório de infraestrutura Kubernetes (`oficina-infra-k8s`) não
  gerencia essa release do Helm — fica a cargo do job `deploy-eks` do app principal.
- Ver [`docs/observability.md`](../observability.md) para o detalhamento completo do
  que está instrumentado e os dashboards configurados.
