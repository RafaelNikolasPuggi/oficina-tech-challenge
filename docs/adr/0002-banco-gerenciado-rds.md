# ADR 0002 — RDS PostgreSQL gerenciado

**Status:** Aceito

## Contexto

Fases 1/2 já justificaram PostgreSQL pelo modelo fortemente relacional e pela
necessidade de transações ACID (baixa de estoque). A Fase 3 pede explicitamente um
"Banco de Dados Gerenciado".

## Decisão

Usar **Amazon RDS para PostgreSQL** (`db.t3.micro`, non-Multi-AZ nesta fase de estudo),
provisionado no repositório `oficina-infra-db`.

## Consequências

- **Positivas:** backups automáticos, patching de segurança sem operação manual,
  failover gerenciável habilitando `multi_az` quando necessário; `db.t3.micro` é
  elegível ao free tier de 12 meses em contas novas.
- **Negativas:** menos controle fino sobre a configuração da engine do que
  self-hosted; custo contínuo fora do free tier (~US$ 0,017/h + armazenamento).
- **Alternativas consideradas:** ver [RFC 0002](../rfc/0002-banco-gerenciado.md)
  (Aurora Serverless v2, DynamoDB, Postgres self-hosted no próprio EKS).
