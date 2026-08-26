export enum StatusOrdemServico {
  RECEBIDA = 'RECEBIDA',
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
  EM_EXECUCAO = 'EM_EXECUCAO',
  FINALIZADA = 'FINALIZADA',
  ENTREGUE = 'ENTREGUE',
  RECUSADA = 'RECUSADA',
}

const TRANSICOES_VALIDAS: Record<StatusOrdemServico, StatusOrdemServico[]> = {
  [StatusOrdemServico.RECEBIDA]: [StatusOrdemServico.EM_DIAGNOSTICO],
  [StatusOrdemServico.EM_DIAGNOSTICO]: [
    StatusOrdemServico.AGUARDANDO_APROVACAO,
  ],
  [StatusOrdemServico.AGUARDANDO_APROVACAO]: [
    StatusOrdemServico.EM_EXECUCAO,
    StatusOrdemServico.RECUSADA,
  ],
  [StatusOrdemServico.EM_EXECUCAO]: [StatusOrdemServico.FINALIZADA],
  [StatusOrdemServico.FINALIZADA]: [StatusOrdemServico.ENTREGUE],
  [StatusOrdemServico.ENTREGUE]: [],
  [StatusOrdemServico.RECUSADA]: [],
};

export function podeTransicionar(
  de: StatusOrdemServico,
  para: StatusOrdemServico,
): boolean {
  return TRANSICOES_VALIDAS[de].includes(para);
}
