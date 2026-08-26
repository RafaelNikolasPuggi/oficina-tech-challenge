import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { OrdemServico } from '../domain/ordem-servico.entity';
import {
  ListarOrdensServicoFiltro,
  OrdemServicoRepository,
} from '../domain/ordem-servico.repository';
import { StatusOrdemServico } from '../domain/status-ordem-servico.enum';
import { OrdemServicoMapper } from './ordem-servico.mapper';
import { OrdemServicoOrmEntity } from './ordem-servico.orm-entity';

@Injectable()
export class TypeOrmOrdemServicoRepository implements OrdemServicoRepository {
  constructor(
    @InjectRepository(OrdemServicoOrmEntity)
    private readonly repo: Repository<OrdemServicoOrmEntity>,
  ) {}

  async salvar(ordemServico: OrdemServico): Promise<OrdemServico> {
    const orm = OrdemServicoMapper.toOrm(ordemServico);
    const salvo = await this.repo.save(orm);
    return OrdemServicoMapper.toDomain(salvo);
  }

  async buscarPorId(id: string): Promise<OrdemServico | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? OrdemServicoMapper.toDomain(orm) : null;
  }

  async listar(
    filtro: ListarOrdensServicoFiltro,
  ): Promise<PaginatedResult<OrdemServico>> {
    const [rows, total] = await this.repo.findAndCount({
      where: filtro.status ? { status: filtro.status } : {},
      order: { dataRecebimento: 'ASC' },
      skip: (filtro.page - 1) * filtro.limit,
      take: filtro.limit,
    });

    return {
      items: rows.map((item) => OrdemServicoMapper.toDomain(item)),
      total,
      page: filtro.page,
      limit: filtro.limit,
    };
  }

  async listarFinalizadas(): Promise<OrdemServico[]> {
    const rows = await this.repo.find({
      where: [
        { status: StatusOrdemServico.FINALIZADA },
        { status: StatusOrdemServico.ENTREGUE },
      ],
    });
    return rows.map((item) => OrdemServicoMapper.toDomain(item));
  }
}
