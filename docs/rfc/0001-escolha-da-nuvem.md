# RFC 0001 — Escolha da nuvem

**Autor:** equipe do projeto · **Status:** Implementado (ver [ADR 0001](../adr/0001-nuvem-aws.md))

## Motivação

A Fase 3 pede infraestrutura de nuvem real com escolha livre de provedor. Precisamos
decidir isso antes de qualquer outro trabalho de infraestrutura, já que a escolha
determina toda a stack de IaC (Terraform providers, módulos, nomenclatura de serviços)
usada nos 4 repositórios.

## Requisitos que a nuvem escolhida precisa atender

- API Gateway gerenciado.
- Function Serverless (para a autenticação por CPF).
- Banco de dados relacional gerenciado.
- Cluster Kubernetes gerenciado, com autoscaling.
- Boa cobertura de módulos Terraform maduros (reduz risco de infraestrutura mal
  configurada em um projeto com prazo apertado).

## Alternativas consideradas

### AWS (escolhida)

- **API Gateway:** API Gateway HTTP API — simples, barato, suporta integração direta
  com Lambda (`AWS_PROXY`) e com um backend HTTP (`HTTP_PROXY`, usado para o app no EKS).
- **Serverless:** AWS Lambda — a própria nomenclatura do desafio ("Function
  Serverless") já aponta para cá.
- **Banco gerenciado:** RDS PostgreSQL — mesma engine já usada nas Fases 1/2, migração
  trivial.
- **Kubernetes gerenciado:** EKS — módulos `terraform-aws-modules/eks` e
  `terraform-aws-modules/vpc` maduros e amplamente documentados.
- **Trade-off:** é o provedor mais "batido" nesse tipo de desafio — vantagem em
  documentação/exemplos disponíveis, desvantagem nenhuma relevante para este contexto.

### Google Cloud Platform

- Equivalentes: Cloud Functions, Cloud SQL, GKE, API Gateway (GCP).
- GKE tem uma reputação operacional um pouco mais simples que EKS (menos peças
  manuais para configurar, ex.: addons). Ficou em segundo lugar por essa razão.
- Descartada principalmente porque a Function Serverless do desafio, em nomenclatura e
  em expectativa do avaliador, mapeia mais diretamente para "Lambda" do que para
  "Cloud Function" — reduz ambiguidade na entrega.

### Azure

- Equivalentes: Azure Functions, Azure Database for PostgreSQL, AKS, Azure API
  Management.
- Descartada por menor familiaridade da equipe com o ecossistema Azure em relação a
  AWS/GCP, o que aumentaria o risco de erros de configuração dado o prazo do desafio.

## Proposta

Adotar **AWS** para toda a infraestrutura da Fase 3, com os 4 repositórios organizados
conforme [`docs/architecture.md`](../architecture.md).

## Custo estimado (ordem de grandeza, região us-east-1)

| Recurso | Custo aproximado |
|---|---|
| EKS control plane | ~US$ 0,10/h (~US$ 72/mês se deixado ligado) |
| NAT Gateway (single) | ~US$ 0,045/h + tráfego |
| 2x EC2 t3.medium (node group) | ~US$ 0,0832/h total |
| RDS db.t3.micro | Free tier 12 meses; depois ~US$ 0,017/h |
| Lambda + API Gateway | Free tier generoso; custo residual desprezível no volume deste projeto |

**Recomendação operacional:** `terraform destroy` nos repositórios `infra-k8s` e
`infra-db` assim que a demonstração/avaliação terminar — não há motivo para manter o
cluster/banco rodando continuamente durante o desenvolvimento do restante do desafio.
