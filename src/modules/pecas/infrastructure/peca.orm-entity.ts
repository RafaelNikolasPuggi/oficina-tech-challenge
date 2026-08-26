import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pecas')
export class PecaOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  nome: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco: string;

  @Column({ type: 'int', name: 'quantidade_estoque' })
  quantidadeEstoque: number;

  @Column({ type: 'int', name: 'quantidade_minima', default: 0 })
  quantidadeMinima: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
