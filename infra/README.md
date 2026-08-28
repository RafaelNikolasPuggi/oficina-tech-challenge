# Infraestrutura como Código (Terraform)

Provisiona, localmente, o que a Fase 2 pede como infraestrutura de base:

1. **Cluster Kubernetes local** (`kind_cluster.this`) — um cluster Kind (1 control-plane + 1 worker) rodando em containers Docker na sua máquina.
2. **Banco de dados** (`kubernetes_deployment.postgres`, `kubernetes_service.postgres`, `kubernetes_persistent_volume_claim.postgres`, `kubernetes_secret.postgres`) — PostgreSQL implantado dentro desse cluster, com volume persistente.

O deploy da **aplicação em si** (Deployment/Service/ConfigMap/Secret/HPA) fica em [`/k8s`](../k8s), aplicado separadamente com `kubectl apply` — são preocupações diferentes: o Terraform provisiona a *infraestrutura*, o `kubectl apply` faz o *deploy da aplicação* nela. É exatamente essa separação que a pipeline de CI/CD (`.github/workflows/ci-cd.yml`) executa como passos distintos.

## Pré-requisitos

- [Docker](https://www.docker.com/) rodando (o Kind cria os nós do cluster como containers Docker).
- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5.
- `kubectl` (para aplicar os manifestos em `/k8s` depois que o cluster existir).

## Como aplicar

```bash
cd infra
terraform init
terraform apply
```

Recursos criados (resumo — `terraform apply` mostra o plano detalhado antes de confirmar):

| Recurso | O que é |
|---|---|
| `kind_cluster.this` | Cluster Kubernetes local (`oficina-tech-challenge`) |
| `kubernetes_namespace.oficina` | Namespace `oficina` |
| `kubernetes_secret.postgres` | Credenciais do Postgres |
| `kubernetes_persistent_volume_claim.postgres` | Volume persistente de 1Gi para os dados do banco |
| `kubernetes_deployment.postgres` | Pod do PostgreSQL |
| `kubernetes_service.postgres` | Service `oficina-postgres`, usado como `DB_HOST` pela aplicação |

Depois de aplicado, aponte o `kubectl` para o cluster e implante a aplicação:

```bash
export KUBECONFIG=$(terraform output -raw kubeconfig_path)
kubectl apply -f ../k8s
kubectl -n oficina rollout status deployment/oficina-app
```

## Variáveis

Veja [`variables.tf`](variables.tf) para a lista completa. As mais relevantes:

| Variável | Padrão | Descrição |
|---|---|---|
| `cluster_name` | `oficina-tech-challenge` | Nome do cluster kind |
| `namespace` | `oficina` | Namespace usado (deve bater com `/k8s`) |
| `postgres_password` | `oficina` | **Troque em qualquer uso além de demo local**, via `TF_VAR_postgres_password` |

## Destruir tudo

```bash
terraform destroy
```

Remove o cluster kind inteiro (containers Docker), sem deixar rastro no sistema.
