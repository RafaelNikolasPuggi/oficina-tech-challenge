import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { InsufficientStockException } from '../../../shared/domain/exceptions';
import { Peca } from '../domain/peca.entity';
import { ItemBaixaEstoque, PecaRepository } from '../domain/peca.repository';
import { PecaMapper } from './peca.mapper';
import { PecaOrmEntity } from './peca.orm-entity';

@Injectable()
export class TypeOrmPecaRepository implements PecaRepository {
  constructor(
    @InjectRepository(PecaOrmEntity)
    private readonly repo: Repository<PecaOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async salvar(peca: Peca): Promise<Peca> {
    const orm = PecaMapper.toOrm(peca);
    const salvo = await this.repo.save(orm);
    return PecaMapper.toDomain(salvo);
  }

  async buscarPorId(id: string): Promise<Peca | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? PecaMapper.toDomain(orm) : null;
  }

  async buscarPorIds(ids: string[]): Promise<Peca[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.find({ where: { id: In(ids) } });
    return rows.map((item) => PecaMapper.toDomain(item));
  }

  async listar(page: number, limit: number): Promise<PaginatedResult<Peca>> {
    const [rows, total] = await this.repo.findAndCount({
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((item) => PecaMapper.toDomain(item)),
      total,
      page,
      limit,
    };
  }

  async remover(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async decrementarEstoqueTransacional(
    itens: ItemBaixaEstoque[],
  ): Promise<void> {
    if (itens.length === 0) return;

    await this.dataSource.transaction(async (manager) => {
      for (const item of itens) {
        const result = await manager
          .createQueryBuilder()
          .update(PecaOrmEntity)
          .set({
            quantidadeEstoque: () =>
              `quantidade_estoque - ${Number(item.quantidade)}`,
          })
          .where('id = :id', { id: item.pecaId })
          .andWhere('quantidade_estoque >= :quantidade', {
            quantidade: item.quantidade,
          })
          .execute();

        if (result.affected === 0) {
          const peca = await manager.findOne(PecaOrmEntity, {
            where: { id: item.pecaId },
          });
          throw new InsufficientStockException(
            peca?.nome ?? item.pecaId,
            peca?.quantidadeEstoque ?? 0,
            item.quantidade,
          );
        }
      }
    });
  }
}
