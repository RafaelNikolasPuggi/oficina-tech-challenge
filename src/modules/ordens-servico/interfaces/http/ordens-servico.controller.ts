import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  OrdensServicoService,
  TempoMedioExecucao,
} from '../../application/ordens-servico.service';
import { AprovacaoOrcamentoDto } from './dto/aprovacao-orcamento.dto';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';
import { ListarOrdensServicoQueryDto } from './dto/listar-ordens-servico-query.dto';
import { OrdemServicoResponseDto } from './dto/ordem-servico-response.dto';
import { RegistrarDiagnosticoDto } from './dto/registrar-diagnostico.dto';

@ApiTags('Ordens de Serviço')
@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Admin] Abre uma nova Ordem de Serviço' })
  async abrir(
    @Body() dto: CreateOrdemServicoDto,
  ): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.abrir({
      clienteId: dto.clienteId,
      veiculoId: dto.veiculoId,
      servicos: dto.servicos,
      pecas: dto.pecas,
    });
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Admin] Lista e filtra as Ordens de Serviço' })
  async listar(@Query() query: ListarOrdensServicoQueryDto) {
    const resultado = await this.ordensServicoService.listar({
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
    return {
      ...resultado,
      items: resultado.items.map((item) =>
        OrdemServicoResponseDto.fromDomain(item),
      ),
    };
  }

  @Get('metricas/tempo-medio')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[Admin] Tempo médio de execução das OS finalizadas',
  })
  async tempoMedioExecucao(): Promise<TempoMedioExecucao> {
    return this.ordensServicoService.tempoMedioExecucao();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[Admin] Detalhamento completo de uma Ordem de Serviço',
  })
  async obter(@Param('id') id: string): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.obter(id);
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Patch(':id/iniciar-diagnostico')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[Admin] Inicia o diagnóstico técnico da Ordem de Serviço',
  })
  async iniciarDiagnostico(
    @Param('id') id: string,
  ): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.iniciarDiagnostico(id);
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Patch(':id/diagnostico')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '[Admin] Registra o diagnóstico, atualiza o orçamento e envia para aprovação',
  })
  async registrarDiagnostico(
    @Param('id') id: string,
    @Body() dto: RegistrarDiagnosticoDto,
  ): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.registrarDiagnostico(
      id,
      dto,
    );
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Patch(':id/finalizar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Admin] Finaliza a execução da Ordem de Serviço' })
  async finalizar(@Param('id') id: string): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.finalizar(id);
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Patch(':id/entregar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[Admin] Marca a Ordem de Serviço como entregue ao cliente',
  })
  async entregar(@Param('id') id: string): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.entregar(id);
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Get(':id/status')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiQuery({ name: 'documento', required: true, example: '123.456.789-09' })
  @ApiOperation({
    summary:
      '[Cliente] Consulta o status da OS mediante confirmação do CPF/CNPJ',
  })
  async consultarStatus(
    @Param('id') id: string,
    @Query('documento') documento: string,
  ): Promise<OrdemServicoResponseDto> {
    const ordemServico = await this.ordensServicoService.consultarStatus(
      id,
      documento,
    );
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }

  @Post(':id/aprovacao')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: '[Cliente] Aprova ou recusa o orçamento gerado no diagnóstico',
  })
  async decidirOrcamento(
    @Param('id') id: string,
    @Body() dto: AprovacaoOrcamentoDto,
  ): Promise<OrdemServicoResponseDto> {
    const ordemServico = dto.aprovado
      ? await this.ordensServicoService.aprovarOrcamento(id, dto.documento)
      : await this.ordensServicoService.recusarOrcamento(id, dto.documento);
    return OrdemServicoResponseDto.fromDomain(ordemServico);
  }
}
