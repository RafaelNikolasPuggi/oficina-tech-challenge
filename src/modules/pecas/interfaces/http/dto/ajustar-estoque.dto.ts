import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AjustarEstoqueDto {
  @ApiProperty({
    example: 10,
    description: 'Positivo para entrada, negativo para saída avulsa',
  })
  @IsInt()
  delta: number;
}
