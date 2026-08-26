import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { IsCpfCnpj } from '../../../../../shared/validators/is-cpf-cnpj.decorator';

export class AprovacaoOrcamentoDto {
  @ApiProperty({
    example: '123.456.789-09',
    description: 'CPF/CNPJ do cliente dono da OS, usado como validação',
  })
  @IsString()
  @IsCpfCnpj()
  documento: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  aprovado: boolean;
}
