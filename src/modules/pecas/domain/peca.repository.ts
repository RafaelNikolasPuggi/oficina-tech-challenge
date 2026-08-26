import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { Peca } from './peca.entity';

export const PECA_REPOSITORY = Symbol('PECA_REPOSITORY');

export interface ItemBaixaEstoque {
  pecaId: string;
  quantidade: number;
}

export interface PecaRepository {
  salvar(peca: Peca): Promise<Peca>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorIds(ids: string[]): Promise<Peca[]>;
  listar(page: number, limit: number): Promise<PaginatedResult<Peca>>;
  remover(id: string): Promise<void>;
  /**
   * Decrementa o estoque de várias peças de forma atômica (uma única
   * transação de banco). Se alguma peça não tiver estoque suficiente no
   * momento da execução, nenhuma alteração é persistida e a exceção
   * InsufficientStockException é lançada — evita condição de corrida entre
   * OS concorrentes disputando a mesma peça.
   */
  decrementarEstoqueTransacional(itens: ItemBaixaEstoque[]): Promise<void>;
}
