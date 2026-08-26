import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateServicoDto {
  @ApiPropertyOptional({ example: 'Troca de óleo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @ApiPropertyOptional({ example: 'Troca de óleo e filtro' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preco?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  tempoEstimadoMinutos?: number;
}
