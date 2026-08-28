# RFC 0002 — Banco de dados gerenciado

**Autor:** equipe do projeto · **Status:** Implementado (ver [ADR 0002](../adr/0002-banco-gerenciado-rds.md))

## Motivação

A Fase 3 exige um "Banco de Dados Gerenciado" como parte da infraestrutura
obrigatória. As Fases 1/2 já usam PostgreSQL via TypeORM; a questão é qual serviço
gerenciado usar e se vale a pena reconsiderar a engine.

## Alternativas consideradas

### Amazon RDS para PostgreSQL (escolhida)

- Mesma engine já usada e testada nas Fases 1/2 — zero mudança no código de acesso a
  dados, migração de ambiente sem risco de regressão.
- Backups automáticos, patching de segurança gerenciado, `multi_az` disponível como
  opção quando o custo se justificar.
- `db.t3.micro` é elegível ao free tier de 12 meses em contas AWS novas — custo
  inicial praticamente zero para fins de estudo/demonstração.

### Aurora Serverless v2 (PostgreSQL-compatible)

- Escalabilidade automática de capacidade (ACUs) conforme carga — interessante para
  picos de OS mencionados no desafio.
- Descartada nesta fase por complexidade/custo desnecessários para o volume de dados e
  tráfego do projeto: Aurora Serverless v2 tem um custo mínimo por ACU mesmo em
  repouso, mais alto que um `db.t3.micro` dedicado, sem benefício prático no volume
  atual de OS. Candidato natural se o volume real de produção crescer.

### DynamoDB (NoSQL gerenciado)

- Descartada: o domínio é fortemente relacional (Cliente → Veículo → OS → Itens de
  Serviço/Peça, com necessidade de transações ACID multi-tabela na baixa de estoque —
  ver `PecaRepository.decrementarEstoqueTransacional`). Modelar isso em DynamoDB
  exigiria desnormalização significativa e perderia as garantias transacionais nativas
  que o domínio depende, sem ganho compensatório de performance no volume atual.

### PostgreSQL self-hosted dentro do próprio EKS

- Já foi a abordagem da Fase 2 (ambiente local, sem custo). Descartada para a Fase 3
  porque o requisito explícito é "gerenciado" — self-hosted exigiria operar
  manualmente backup, patching e alta disponibilidade, contrariando o objetivo de
  "operação corporativa" que a Fase 3 busca.

## Proposta

Manter PostgreSQL, migrar para **RDS gerenciado** (`db.t3.micro`), provisionado no
repositório `oficina-infra-db`, dentro da VPC privada compartilhada com o EKS —
nunca publicamente acessível (ver [ADR 0002](../adr/0002-banco-gerenciado-rds.md) e
[`docs/database/`](../database) para o modelo de dados e diagramas ER).
