import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePecaDto {
  @ApiPropertyOptional({ example: 'Filtro de óleo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @ApiPropertyOptional({ example: 45.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preco?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantidadeMinima?: number;
}
