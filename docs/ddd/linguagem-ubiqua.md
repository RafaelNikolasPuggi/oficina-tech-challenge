# Linguagem Ubíqua

Glossário do domínio **Atendimento e Execução de Serviços** da oficina mecânica, usado
de forma consistente entre negócio e código (nomes de classes, métodos e variáveis no
código-fonte espelham estes termos).

| Termo | Significado |
|---|---|
| **Cliente** | Pessoa física ou jurídica dona de um ou mais veículos, identificada de forma única pelo CPF/CNPJ. |
| **Veículo** | Automóvel de um cliente, identificado de forma única pela placa (formato antigo ou Mercosul). |
| **Serviço** | Item do catálogo de mão de obra oferecido pela oficina (ex.: troca de óleo, alinhamento), com preço e tempo estimado. |
| **Peça** (ou **insumo**) | Item do catálogo de materiais aplicados nos serviços (ex.: filtro de óleo), com preço e controle de estoque. |
| **Ordem de Serviço (OS)** | Agregado central: representa o atendimento completo de um veículo, do recebimento à entrega — reúne cliente, veículo, itens de serviço/peça solicitados, orçamento e status. |
| **Diagnóstico** | Etapa em que a oficina inspeciona o veículo e identifica, além dos serviços solicitados originalmente, quais serviços/peças adicionais são necessários. |
| **Orçamento** | Valor total da OS, calculado automaticamente como a soma dos itens de serviço e peça (preço unitário × quantidade). Gerado (e regerado) sempre que o diagnóstico é registrado. |
| **Aprovação do Orçamento** | Decisão do cliente (aprovar ou recusar) sobre o orçamento gerado no diagnóstico. Validada pelo CPF/CNPJ do cliente dono da OS. |
| **Status da OS** | Estado atual do atendimento: `Recebida`, `Em diagnóstico`, `Aguardando aprovação`, `Em execução`, `Finalizada`, `Entregue` (ou `Recusada`, terminal alternativo). Transições são automáticas, disparadas por ações no sistema, e validadas por uma máquina de estados — nunca atribuídas livremente. |
| **Baixa de Estoque** | Redução da quantidade disponível de uma peça, disparada de forma atômica no momento em que o orçamento é aprovado. |
| **Tempo de Execução** | Intervalo entre o início da execução (aprovação do orçamento) e a finalização da OS, usado para calcular o tempo médio de execução dos serviços. |
| **Usuário Administrativo** | Colaborador da oficina autenticado via JWT, com acesso às rotas de gestão (CRUD de catálogos, condução do atendimento). |

## Convenções

- Nomes de entidades, métodos de domínio e mensagens de exceção são escritos em
  português, no mesmo vocabulário usado pelo negócio (ex.: `registrarDiagnostico`,
  `aprovarOrcamento`, não `updateStatus`/`setStep3`).
- "Peça" e "insumo" são tratados como sinônimos no negócio; no código, a entidade é
  sempre `Peca`.
- O termo "OS" (abreviação de Ordem de Serviço) é usado tanto pelo negócio quanto no
  código (rotas `/ordens-servico`, classe `OrdemServico`).
