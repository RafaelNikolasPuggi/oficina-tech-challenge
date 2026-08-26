import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ServicosService } from './application/servicos.service';
import { SERVICO_REPOSITORY } from './domain/servico.repository';
import { ServicoOrmEntity } from './infrastructure/servico.orm-entity';
import { TypeOrmServicoRepository } from './infrastructure/servico.repository.impl';
import { ServicosController } from './interfaces/http/servicos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServicoOrmEntity]), AuthModule],
  controllers: [ServicosController],
  providers: [
    ServicosService,
    { provide: SERVICO_REPOSITORY, useClass: TypeOrmServicoRepository },
  ],
  exports: [SERVICO_REPOSITORY],
})
export class ServicosModule {}
