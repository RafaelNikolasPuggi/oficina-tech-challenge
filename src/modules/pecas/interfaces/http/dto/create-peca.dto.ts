import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreatePecaDto {
  @ApiProperty({ example: 'Filtro de óleo' })
  @IsString()
  @MinLength(2)
  nome: string;

  @ApiProperty({ example: 45.9 })
  @IsNumber()
  @Min(0)
  preco: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  quantidadeEstoque: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  quantidadeMinima: number;
}
