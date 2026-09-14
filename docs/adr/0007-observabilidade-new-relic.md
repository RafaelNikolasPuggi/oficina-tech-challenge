# ADR 0007 — Observabilidade via New Relic (não Datadog)

**Status:** Aceito

## Contexto

A Fase 3 exige integração com uma ferramenta de observabilidade, com escolha livre
entre Datadog ou New Relic. A instrumentação inicial (APM, logs estruturados
correlacionados) foi implementada contra o Datadog, mas nenhuma conta real chegou a
ser criada — quando a conta New Relic ficou disponível, a instrumentação foi trocada
para não manter duas integrações paralelas no código.

## Decisão

- Agente Node.js do New Relic (`newrelic`) substitui `dd-trace` como APM —
  inicializado como primeiro import de `main.ts` ([`src/tracer.ts`](../../src/tracer.ts)),
  gated por `NEW_RELIC_ENABLED`, configurado só por variáveis de ambiente
  (`NEW_RELIC_NO_CONFIG_FILE=true`, sem arquivo de config commitado).
- `JsonLoggerService` usa `newrelic.getLinkingMetadata()` (em vez do context do
  `dd-trace`) para injetar `trace.id`/`span.id`/`entity.guid` nos logs — mesmo
  propósito de correlação log↔trace, formato específico do New Relic.
- A integração de Kubernetes (métricas de CPU/memória por nó/pod, `kube-state-metrics`,
  encaminhamento de logs via Fluent Bit) passa a ser o chart oficial `nri-bundle`,
  instalado via Helm no job `deploy-eks` — substitui o DaemonSet único do Datadog Agent
  que era aplicado como manifesto puro.
- O segredo `NEW_RELIC_LICENSE_KEY` (tipo *Ingest - License*) substitui `DD_API_KEY`
  como secret do repositório; ambos os fluxos são opcionais (`if [ -n ... ]`/`if:` no
  workflow) para não quebrar quando a chave ainda não está configurada.

## Consequências

- **Positivas:** nenhuma duplicação de instrumentação (só um APM ativo por vez);
  `nri-bundle` cobre métricas + logs do cluster em uma única instalação, sem precisar
  escrever/manter um DaemonSet manifesto à mão.
- **Negativas:** a instalação via Helm adiciona uma dependência (`azure/setup-helm`) ao
  pipeline que não existia antes; o repositório de infraestrutura Kubernetes
  (`oficina-infra-k8s`) continua sem gerenciar essa release do Helm — fica a cargo do
  job `deploy-eks` do app principal, avaliação aceita dado o escopo do desafio.
- Ver [`docs/observability.md`](../observability.md) para o detalhamento completo do
  que está instrumentado e os dashboards a configurar na UI do New Relic.
