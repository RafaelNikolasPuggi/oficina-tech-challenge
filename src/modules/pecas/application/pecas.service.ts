import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { Peca } from '../domain/peca.entity';
import { PECA_REPOSITORY } from '../domain/peca.repository';
import type { PecaRepository } from '../domain/peca.repository';

export interface CriarPecaInput {
  nome: string;
  preco: number;
  quantidadeEstoque: number;
  quantidadeMinima: number;
}

export interface AtualizarPecaInput {
  nome?: string;
  preco?: number;
  quantidadeMinima?: number;
}

@Injectable()
export class PecasService {
  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecaRepository: PecaRepository,
  ) {}

  async criar(input: CriarPecaInput): Promise<Peca> {
    const peca = Peca.criar({ id: randomUUID(), ...input });
    return this.pecaRepository.salvar(peca);
  }

  async atualizar(id: string, input: AtualizarPecaInput): Promise<Peca> {
    const peca = await this.obter(id);
    peca.atualizar(input);
    return this.pecaRepository.salvar(peca);
  }

  async ajustarEstoque(id: string, delta: number): Promise<Peca> {
    const peca = await this.obter(id);
    peca.ajustarEstoque(delta);
    return this.pecaRepository.salvar(peca);
  }

  async obter(id: string): Promise<Peca> {
    const peca = await this.pecaRepository.buscarPorId(id);
    if (!peca) {
      throw new EntityNotFoundException('Peça', id);
    }
    return peca;
  }

  async listar(page: number, limit: number): Promise<PaginatedResult<Peca>> {
    return this.pecaRepository.listar(page, limit);
  }

  async remover(id: string): Promise<void> {
    await this.obter(id);
    await this.pecaRepository.remover(id);
  }
}
