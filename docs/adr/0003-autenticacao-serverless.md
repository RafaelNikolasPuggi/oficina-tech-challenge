# ADR 0003 — Autenticação de clientes via Function Serverless + JWT

**Status:** Aceito

## Contexto

A Fase 3 pede que rotas sensíveis sejam protegidas por autenticação via CPF, com uma
Function Serverless dedicada a validar o documento, consultar a existência do cliente
e emitir um JWT. Isso substitui a validação de CPF por requisição usada nas Fases 1/2
(query param/body em cada chamada).

## Decisão

- `POST /auth/cliente` (repositório `oficina-lambda-auth`) valida o documento, consulta
  o RDS e emite um JWT de curta duração (30 min) com claim `tipo: "cliente"`.
- O app principal ganha um guard dedicado (`ClienteAuthGuard`/`ClienteJwtStrategy`,
  estratégia Passport separada da administrativa) que valida esse token nas rotas
  `GET /ordens-servico/:id/status` e `POST /ordens-servico/:id/aprovacao`.
- O `clienteId` usado para checar posse da OS vem do `sub` do token, não mais de um
  parâmetro solto — elimina a necessidade de revalidar o CPF a cada chamada.
- O segredo do JWT é gerado pela Lambda e publicado no SSM Parameter Store para o app
  principal ler no deploy — nunca hardcoded em nenhum dos dois repositórios.

## Consequências

- **Positivas:** modelo de autenticação consistente com o admin (JWT + guard),
  reduz superfície de repetição de validação de CPF, single responsibility mais clara
  (a Lambda só autentica; o app só valida o token).
- **Negativas:** acopla os dois repositórios pelo segredo compartilhado — mitigado
  publicando/lendo via SSM (ver ADR 0006), nunca por arquivo commitado.
- Tokens de cliente têm expiração curta (30 min) — cliente precisa autenticar de novo
  para uma sessão longa; aceitável para o caso de uso (consulta pontual de status).
