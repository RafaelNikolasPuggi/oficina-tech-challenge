import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ClientesModule } from '../clientes/clientes.module';
import { PecasModule } from '../pecas/pecas.module';
import { ServicosModule } from '../servicos/servicos.module';
import { VeiculosModule } from '../veiculos/veiculos.module';
import { OrdensServicoService } from './application/ordens-servico.service';
import { ORDEM_SERVICO_REPOSITORY } from './domain/ordem-servico.repository';
import { OrdemServicoOrmEntity } from './infrastructure/ordem-servico.orm-entity';
import { TypeOrmOrdemServicoRepository } from './infrastructure/ordem-servico.repository.impl';
import { OrdensServicoController } from './interfaces/http/ordens-servico.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrdemServicoOrmEntity]),
    AuthModule,
    ClientesModule,
    VeiculosModule,
    ServicosModule,
    PecasModule,
  ],
  controllers: [OrdensServicoController],
  providers: [
    OrdensServicoService,
    {
      provide: ORDEM_SERVICO_REPOSITORY,
      useClass: TypeOrmOrdemServicoRepository,
    },
  ],
})
export class OrdensServicoModule {}
