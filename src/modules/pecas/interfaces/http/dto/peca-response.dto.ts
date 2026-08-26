import { ApiProperty } from '@nestjs/swagger';
import { Peca } from '../../../domain/peca.entity';

export class PecaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  preco: number;

  @ApiProperty()
  quantidadeEstoque: number;

  @ApiProperty()
  quantidadeMinima: number;

  @ApiProperty()
  abaixoDoMinimo: boolean;

  static fromDomain(peca: Peca): PecaResponseDto {
    const dto = new PecaResponseDto();
    dto.id = peca.id;
    dto.nome = peca.getNome();
    dto.preco = peca.getPreco();
    dto.quantidadeEstoque = peca.getQuantidadeEstoque();
    dto.quantidadeMinima = peca.getQuantidadeMinima();
    dto.abaixoDoMinimo = peca.estaAbaixoDoMinimo();
    return dto;
  }
}
