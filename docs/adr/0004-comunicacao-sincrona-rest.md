# ADR 0004 — Comunicação síncrona via REST/HTTP

**Status:** Aceito

## Contexto

O sistema tem hoje dois pontos de integração entre componentes: API Gateway → app
principal (rotas de negócio) e cliente → Lambda de autenticação → app principal
(fluxo de login). É preciso decidir o padrão de comunicação entre eles.

## Decisão

Manter comunicação **síncrona via REST/HTTP** em todas as integrações (não introduzir
fila/broker de mensagens nesta fase).

## Consequências

- **Positivas:** simplicidade operacional (sem infraestrutura adicional de
  mensageria), latência previsível para os fluxos atuais (consulta de status,
  autenticação, aprovação de orçamento são naturalmente request/response), mais fácil
  de testar e depurar (e2e com supertest, sem necessidade de mocks de fila).
- **Negativas:** acoplamento temporal — o chamador espera a resposta; não há retry
  automático nem buffer de carga. Aceitável porque nenhum fluxo atual é
  fire-and-forget de longa duração (o envio de e-mail, que poderia ser assíncrono, já
  é tratado como best-effort não bloqueante dentro do próprio processo — ver
  `EmailService`).
- **Reavaliar quando:** picos de carga muito maiores que o HPA atual absorve, ou
  necessidade de processar eventos entre serviços de forma desacoplada (ex.: histórico
  de auditoria, integrações com terceiros) — candidato natural a SQS/EventBridge em
  uma fase futura, não introduzido agora por não haver caso de uso concreto que
  justifique a complexidade operacional adicional.
