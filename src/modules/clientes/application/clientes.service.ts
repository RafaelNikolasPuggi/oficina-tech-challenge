import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import {
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../shared/domain/exceptions';
import { Cliente } from '../domain/cliente.entity';
import { CLIENTE_REPOSITORY } from '../domain/cliente.repository';
import type { ClienteRepository } from '../domain/cliente.repository';

export interface CriarClienteInput {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
}

export interface AtualizarClienteInput {
  nome?: string;
  email?: string;
  telefone?: string;
}

@Injectable()
export class ClientesService {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async criar(input: CriarClienteInput): Promise<Cliente> {
    const existente = await this.clienteRepository.buscarPorDocumento(
      input.documento,
    );
    if (existente) {
      throw new DuplicateEntityException(
        'Cliente',
        'documento',
        input.documento,
      );
    }

    const cliente = Cliente.criar({ id: randomUUID(), ...input });
    return this.clienteRepository.salvar(cliente);
  }

  async atualizar(id: string, input: AtualizarClienteInput): Promise<Cliente> {
    const cliente = await this.obter(id);
    cliente.atualizar(input);
    return this.clienteRepository.salvar(cliente);
  }

  async obter(id: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.buscarPorId(id);
    if (!cliente) {
      throw new EntityNotFoundException('Cliente', id);
    }
    return cliente;
  }

  async listar(page: number, limit: number): Promise<PaginatedResult<Cliente>> {
    return this.clienteRepository.listar(page, limit);
  }

  async remover(id: string): Promise<void> {
    await this.obter(id);
    await this.clienteRepository.remover(id);
  }
}
