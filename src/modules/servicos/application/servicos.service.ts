import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { Servico } from '../domain/servico.entity';
import { SERVICO_REPOSITORY } from '../domain/servico.repository';
import type { ServicoRepository } from '../domain/servico.repository';

export interface CriarServicoInput {
  nome: string;
  descricao: string;
  preco: number;
  tempoEstimadoMinutos: number;
}

export interface AtualizarServicoInput {
  nome?: string;
  descricao?: string;
  preco?: number;
  tempoEstimadoMinutos?: number;
}

@Injectable()
export class ServicosService {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async criar(input: CriarServicoInput): Promise<Servico> {
    const servico = Servico.criar({ id: randomUUID(), ...input });
    return this.servicoRepository.salvar(servico);
  }

  async atualizar(id: string, input: AtualizarServicoInput): Promise<Servico> {
    const servico = await this.obter(id);
    servico.atualizar(input);
    return this.servicoRepository.salvar(servico);
  }

  async obter(id: string): Promise<Servico> {
    const servico = await this.servicoRepository.buscarPorId(id);
    if (!servico) {
      throw new EntityNotFoundException('Serviço', id);
    }
    return servico;
  }

  async listar(page: number, limit: number): Promise<PaginatedResult<Servico>> {
    return this.servicoRepository.listar(page, limit);
  }

  async remover(id: string): Promise<void> {
    await this.obter(id);
    await this.servicoRepository.remover(id);
  }
}
