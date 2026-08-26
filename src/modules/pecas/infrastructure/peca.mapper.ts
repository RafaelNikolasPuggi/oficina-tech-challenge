import { Peca } from '../domain/peca.entity';
import { PecaOrmEntity } from './peca.orm-entity';

export class PecaMapper {
  static toDomain(orm: PecaOrmEntity): Peca {
    return Peca.criar({
      id: orm.id,
      nome: orm.nome,
      preco: parseFloat(orm.preco),
      quantidadeEstoque: orm.quantidadeEstoque,
      quantidadeMinima: orm.quantidadeMinima,
    });
  }

  static toOrm(domain: Peca): PecaOrmEntity {
    const orm = new PecaOrmEntity();
    orm.id = domain.id;
    orm.nome = domain.getNome();
    orm.preco = domain.getPreco().toFixed(2);
    orm.quantidadeEstoque = domain.getQuantidadeEstoque();
    orm.quantidadeMinima = domain.getQuantidadeMinima();
    return orm;
  }
}
