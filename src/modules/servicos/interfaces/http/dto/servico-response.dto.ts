import { ApiProperty } from '@nestjs/swagger';
import { Servico } from '../../../domain/servico.entity';

export class ServicoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  descricao: string;

  @ApiProperty()
  preco: number;

  @ApiProperty()
  tempoEstimadoMinutos: number;

  static fromDomain(servico: Servico): ServicoResponseDto {
    const dto = new ServicoResponseDto();
    dto.id = servico.id;
    dto.nome = servico.getNome();
    dto.descricao = servico.getDescricao();
    dto.preco = servico.getPreco();
    dto.tempoEstimadoMinutos = servico.getTempoEstimadoMinutos();
    return dto;
  }
}
