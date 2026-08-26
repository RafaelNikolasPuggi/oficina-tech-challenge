import { Servico } from '../domain/servico.entity';
import { ServicoOrmEntity } from './servico.orm-entity';

export class ServicoMapper {
  static toDomain(orm: ServicoOrmEntity): Servico {
    return Servico.criar({
      id: orm.id,
      nome: orm.nome,
      descricao: orm.descricao,
      preco: parseFloat(orm.preco),
      tempoEstimadoMinutos: orm.tempoEstimadoMinutos,
    });
  }

  static toOrm(domain: Servico): ServicoOrmEntity {
    const orm = new ServicoOrmEntity();
    orm.id = domain.id;
    orm.nome = domain.getNome();
    orm.descricao = domain.getDescricao();
    orm.preco = domain.getPreco().toFixed(2);
    orm.tempoEstimadoMinutos = domain.getTempoEstimadoMinutos();
    return orm;
  }
}
