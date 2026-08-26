import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../../../shared/dto/pagination.dto';
import { PecasService } from '../../application/pecas.service';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';
import { CreatePecaDto } from './dto/create-peca.dto';
import { PecaResponseDto } from './dto/peca-response.dto';
import { UpdatePecaDto } from './dto/update-peca.dto';

@ApiTags('Peças')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pecas')
export class PecasController {
  constructor(private readonly pecasService: PecasService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra uma peça no catálogo/estoque' })
  async criar(@Body() dto: CreatePecaDto): Promise<PecaResponseDto> {
    const peca = await this.pecasService.criar(dto);
    return PecaResponseDto.fromDomain(peca);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as peças do catálogo' })
  async listar(@Query() query: PaginationQueryDto) {
    const resultado = await this.pecasService.listar(query.page, query.limit);
    return {
      ...resultado,
      items: resultado.items.map((item) => PecaResponseDto.fromDomain(item)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma peça pelo id' })
  async obter(@Param('id') id: string): Promise<PecaResponseDto> {
    const peca = await this.pecasService.obter(id);
    return PecaResponseDto.fromDomain(peca);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados cadastrais de uma peça' })
  async atualizar(
    @Param('id') id: string,
    @Body() dto: UpdatePecaDto,
  ): Promise<PecaResponseDto> {
    const peca = await this.pecasService.atualizar(id, dto);
    return PecaResponseDto.fromDomain(peca);
  }

  @Patch(':id/estoque')
  @ApiOperation({
    summary: 'Ajusta manualmente a quantidade em estoque de uma peça',
  })
  async ajustarEstoque(
    @Param('id') id: string,
    @Body() dto: AjustarEstoqueDto,
  ): Promise<PecaResponseDto> {
    const peca = await this.pecasService.ajustarEstoque(id, dto.delta);
    return PecaResponseDto.fromDomain(peca);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma peça do catálogo' })
  async remover(@Param('id') id: string): Promise<void> {
    await this.pecasService.remover(id);
  }
}
