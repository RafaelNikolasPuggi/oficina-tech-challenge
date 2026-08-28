# ADR 0001 — Escolha da AWS como provedor de nuvem

**Status:** Aceito

## Contexto

A Fase 3 exige infraestrutura de nuvem real: API Gateway, Function Serverless, banco
de dados gerenciado e cluster Kubernetes com escalabilidade. A escolha de provedor é
livre.

## Decisão

Usar **AWS**.

## Consequências

- **Positivas:** a nomenclatura do desafio ("Function Serverless"/Lambda) já indica
  AWS; documentação e exemplos abundantes; EKS, RDS, Lambda e API Gateway HTTP API
  cobrem exatamente os requisitos sem workarounds; `terraform-aws-modules` oferece
  módulos maduros para VPC/EKS, reduzindo risco de infraestrutura mal configurada.
- **Negativas:** vendor lock-in nos nomes de recursos (RDS, EKS) — mitigado por manter
  a aplicação em si (Node/NestJS/Docker) portável; custo real de operação (ver RFC
  0002 para o detalhamento e ADR 0002 para a escolha do banco).
- Ver [RFC 0001](../rfc/0001-escolha-da-nuvem.md) para a análise completa das
  alternativas consideradas (GCP, Azure).
