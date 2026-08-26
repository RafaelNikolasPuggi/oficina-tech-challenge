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
import { ServicosService } from '../../application/servicos.service';
import { CreateServicoDto } from './dto/create-servico.dto';
import { ServicoResponseDto } from './dto/servico-response.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';

@ApiTags('Serviços')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um serviço no catálogo' })
  async criar(@Body() dto: CreateServicoDto): Promise<ServicoResponseDto> {
    const servico = await this.servicosService.criar(dto);
    return ServicoResponseDto.fromDomain(servico);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os serviços do catálogo' })
  async listar(@Query() query: PaginationQueryDto) {
    const resultado = await this.servicosService.listar(
      query.page,
      query.limit,
    );
    return {
      ...resultado,
      items: resultado.items.map((item) => ServicoResponseDto.fromDomain(item)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um serviço pelo id' })
  async obter(@Param('id') id: string): Promise<ServicoResponseDto> {
    const servico = await this.servicosService.obter(id);
    return ServicoResponseDto.fromDomain(servico);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um serviço do catálogo' })
  async atualizar(
    @Param('id') id: string,
    @Body() dto: UpdateServicoDto,
  ): Promise<ServicoResponseDto> {
    const servico = await this.servicosService.atualizar(id, dto);
    return ServicoResponseDto.fromDomain(servico);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um serviço do catálogo' })
  async remover(@Param('id') id: string): Promise<void> {
    await this.servicosService.remover(id);
  }
}
