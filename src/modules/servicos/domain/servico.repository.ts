import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { Servico } from './servico.entity';

export const SERVICO_REPOSITORY = Symbol('SERVICO_REPOSITORY');

export interface ServicoRepository {
  salvar(servico: Servico): Promise<Servico>;
  buscarPorId(id: string): Promise<Servico | null>;
  buscarPorIds(ids: string[]): Promise<Servico[]>;
  listar(page: number, limit: number): Promise<PaginatedResult<Servico>>;
  remover(id: string): Promise<void>;
}
