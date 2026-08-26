import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServicoDto {
  @ApiProperty({ example: 'Troca de óleo' })
  @IsString()
  @MinLength(2)
  nome: string;

  @ApiProperty({ example: 'Troca de óleo e filtro' })
  @IsString()
  descricao: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  preco: number;

  @ApiProperty({ example: 60, description: 'Tempo estimado em minutos' })
  @IsInt()
  @IsPositive()
  tempoEstimadoMinutos: number;
}
