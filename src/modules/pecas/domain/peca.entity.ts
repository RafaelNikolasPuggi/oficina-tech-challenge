import { Entity } from '../../../shared/domain/entity.base';
import {
  DomainException,
  InsufficientStockException,
} from '../../../shared/domain/exceptions';

export interface PecaProps {
  id: string;
  nome: string;
  preco: number;
  quantidadeEstoque: number;
  quantidadeMinima: number;
}

export class Peca extends Entity {
  private nome: string;
  private preco: number;
  private quantidadeEstoque: number;
  private quantidadeMinima: number;

  private constructor(
    id: string,
    nome: string,
    preco: number,
    quantidadeEstoque: number,
    quantidadeMinima: number,
  ) {
    super(id);
    this.nome = nome;
    this.preco = preco;
    this.quantidadeEstoque = quantidadeEstoque;
    this.quantidadeMinima = quantidadeMinima;
  }

  static criar(props: PecaProps): Peca {
    if (!props.nome?.trim()) {
      throw new DomainException('Nome da peça é obrigatório');
    }
    if (props.preco < 0) {
      throw new DomainException('Preço da peça não pode ser negativo');
    }
    if (props.quantidadeEstoque < 0) {
      throw new DomainException('Quantidade em estoque não pode ser negativa');
    }
    if (props.quantidadeMinima < 0) {
      throw new DomainException('Quantidade mínima não pode ser negativa');
    }

    return new Peca(
      props.id,
      props.nome.trim(),
      props.preco,
      props.quantidadeEstoque,
      props.quantidadeMinima,
    );
  }

  atualizar(dados: {
    nome?: string;
    preco?: number;
    quantidadeMinima?: number;
  }): void {
    if (dados.nome !== undefined) this.nome = dados.nome.trim();
    if (dados.preco !== undefined) {
      if (dados.preco < 0)
        throw new DomainException('Preço da peça não pode ser negativo');
      this.preco = dados.preco;
    }
    if (dados.quantidadeMinima !== undefined) {
      if (dados.quantidadeMinima < 0)
        throw new DomainException('Quantidade mínima não pode ser negativa');
      this.quantidadeMinima = dados.quantidadeMinima;
    }
  }

  /** Ajusta o estoque manualmente (entrada ou saída avulsa, fora do fluxo de OS). */
  ajustarEstoque(delta: number): void {
    const nova = this.quantidadeEstoque + delta;
    if (nova < 0) {
      throw new InsufficientStockException(
        this.nome,
        this.quantidadeEstoque,
        -delta,
      );
    }
    this.quantidadeEstoque = nova;
  }

  temEstoqueSuficiente(quantidade: number): boolean {
    return this.quantidadeEstoque >= quantidade;
  }

  estaAbaixoDoMinimo(): boolean {
    return this.quantidadeEstoque < this.quantidadeMinima;
  }

  getNome(): string {
    return this.nome;
  }

  getPreco(): number {
    return this.preco;
  }

  getQuantidadeEstoque(): number {
    return this.quantidadeEstoque;
  }

  getQuantidadeMinima(): number {
    return this.quantidadeMinima;
  }
}
