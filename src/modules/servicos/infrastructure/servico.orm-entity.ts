import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('servicos')
export class ServicoOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  nome: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descricao: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco: string;

  @Column({ type: 'int', name: 'tempo_estimado_minutos' })
  tempoEstimadoMinutos: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
