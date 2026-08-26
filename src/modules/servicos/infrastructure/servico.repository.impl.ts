import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { Servico } from '../domain/servico.entity';
import { ServicoRepository } from '../domain/servico.repository';
import { ServicoMapper } from './servico.mapper';
import { ServicoOrmEntity } from './servico.orm-entity';

@Injectable()
export class TypeOrmServicoRepository implements ServicoRepository {
  constructor(
    @InjectRepository(ServicoOrmEntity)
    private readonly repo: Repository<ServicoOrmEntity>,
  ) {}

  async salvar(servico: Servico): Promise<Servico> {
    const orm = ServicoMapper.toOrm(servico);
    const salvo = await this.repo.save(orm);
    return ServicoMapper.toDomain(salvo);
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? ServicoMapper.toDomain(orm) : null;
  }

  async buscarPorIds(ids: string[]): Promise<Servico[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.find({ where: { id: In(ids) } });
    return rows.map((item) => ServicoMapper.toDomain(item));
  }

  async listar(page: number, limit: number): Promise<PaginatedResult<Servico>> {
    const [rows, total] = await this.repo.findAndCount({
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((item) => ServicoMapper.toDomain(item)),
      total,
      page,
      limit,
    };
  }

  async remover(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
