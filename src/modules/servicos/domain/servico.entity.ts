import { Entity } from '../../../shared/domain/entity.base';
import { DomainException } from '../../../shared/domain/exceptions';

export interface ServicoProps {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  tempoEstimadoMinutos: number;
}

export class Servico extends Entity {
  private nome: string;
  private descricao: string;
  private preco: number;
  private tempoEstimadoMinutos: number;

  private constructor(
    id: string,
    nome: string,
    descricao: string,
    preco: number,
    tempoEstimadoMinutos: number,
  ) {
    super(id);
    this.nome = nome;
    this.descricao = descricao;
    this.preco = preco;
    this.tempoEstimadoMinutos = tempoEstimadoMinutos;
  }

  static criar(props: ServicoProps): Servico {
    if (!props.nome?.trim()) {
      throw new DomainException('Nome do serviço é obrigatório');
    }
    if (props.preco < 0) {
      throw new DomainException('Preço do serviço não pode ser negativo');
    }
    if (props.tempoEstimadoMinutos <= 0) {
      throw new DomainException('Tempo estimado do serviço deve ser positivo');
    }

    return new Servico(
      props.id,
      props.nome.trim(),
      props.descricao?.trim() ?? '',
      props.preco,
      props.tempoEstimadoMinutos,
    );
  }

  atualizar(dados: {
    nome?: string;
    descricao?: string;
    preco?: number;
    tempoEstimadoMinutos?: number;
  }): void {
    if (dados.nome !== undefined) this.nome = dados.nome.trim();
    if (dados.descricao !== undefined) this.descricao = dados.descricao.trim();
    if (dados.preco !== undefined) {
      if (dados.preco < 0)
        throw new DomainException('Preço do serviço não pode ser negativo');
      this.preco = dados.preco;
    }
    if (dados.tempoEstimadoMinutos !== undefined) {
      if (dados.tempoEstimadoMinutos <= 0)
        throw new DomainException(
          'Tempo estimado do serviço deve ser positivo',
        );
      this.tempoEstimadoMinutos = dados.tempoEstimadoMinutos;
    }
  }

  getNome(): string {
    return this.nome;
  }

  getDescricao(): string {
    return this.descricao;
  }

  getPreco(): number {
    return this.preco;
  }

  getTempoEstimadoMinutos(): number {
    return this.tempoEstimadoMinutos;
  }
}
