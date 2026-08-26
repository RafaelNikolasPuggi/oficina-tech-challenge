import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PecasService } from './application/pecas.service';
import { PECA_REPOSITORY } from './domain/peca.repository';
import { PecaOrmEntity } from './infrastructure/peca.orm-entity';
import { TypeOrmPecaRepository } from './infrastructure/peca.repository.impl';
import { PecasController } from './interfaces/http/pecas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PecaOrmEntity]), AuthModule],
  controllers: [PecasController],
  providers: [
    PecasService,
    { provide: PECA_REPOSITORY, useClass: TypeOrmPecaRepository },
  ],
  exports: [PECA_REPOSITORY],
})
export class PecasModule {}
