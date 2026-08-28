# ADR 0006 — SSM Parameter Store para integração entre os 4 repositórios

**Status:** Aceito

## Contexto

A Fase 3 exige 4 repositórios Terraform/aplicação separados
(`oficina-lambda-auth`, `oficina-infra-k8s`, `oficina-infra-db`,
`oficina-tech-challenge`), cada um com seu próprio state e pipeline. Mas eles não são
independentes de fato: a Lambda precisa da VPC (criada pelo `infra-k8s`) e do endpoint
do banco (criado pelo `infra-db`); o app principal precisa do endpoint do banco e do
segredo JWT (gerado pela Lambda); o `infra-db` precisa da VPC/subnets. É preciso um
jeito de um repositório Terraform ler outputs de outro sem os acoplar diretamente.

## Alternativas consideradas

1. **`terraform_remote_state` apontando pro state de outro repositório** (ex.: S3
   backend compartilhado). Funciona, mas acopla fortemente a implementação: qualquer
   repositório que lê o remote state passa a depender da estrutura interna
   (nomes de resource/module) do outro, e do backend específico usado. Mudar a
   organização interna de um repo quebra silenciosamente os outros.
2. **Copiar/colar valores manualmente** entre repositórios (ex.: variável hardcoded).
   Simples, mas frágil e propenso a divergência — o tipo de coisa que quebra "no dia
   da demonstração" sem aviso.
3. **AWS SSM Parameter Store como contrato explícito.** Cada repositório publica só o
   que os outros precisam, com nomes de parâmetro estáveis (`/oficina/vpc_id`,
   `/oficina/db_endpoint`, etc.) documentados no README de cada repo. Quem lê usa
   `data "aws_ssm_parameter"` — não sabe nem precisa saber como o valor foi produzido.

## Decisão

Usar **SSM Parameter Store** (opção 3) como o único ponto de acoplamento entre os 4
repositórios Terraform.

## Consequências

- **Positivas:** cada repositório é genuinely independente na sua implementação
  interna — só o "contrato" de nomes de parâmetro é compartilhado, funciona como uma
  API entre os repos. Segredos (`SecureString`) ficam criptografados em repouso e
  nunca em arquivo de state legível/commitado.
- **Negativas:** ordem de aplicação importa (`infra-k8s` → `infra-db` →
  `lambda-auth`/deploy do app) — documentado em cada README. Um `terraform destroy`
  no `infra-k8s` sem destruir os dependentes primeiro deixa parâmetros "órfãos"
  apontando para recursos que não existem mais — mitigado documentando a ordem de
  destroy também.
- Nomes de parâmetro errados quebram silenciosamente em tempo de `apply` (erro claro
  do provider AWS: "parameter not found") — não em tempo de `plan`/`validate`, já que
  `data` sources só são resolvidos com credenciais reais.
