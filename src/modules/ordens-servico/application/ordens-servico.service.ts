import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DomainException,
  EntityNotFoundException,
  InsufficientStockException,
} from '../../../shared/domain/exceptions';
import { PaginatedResult } from '../../../shared/dto/pagination.dto';
import { EmailService } from '../../../shared/notifications/email.service';
import { CLIENTE_REPOSITORY } from '../../clientes/domain/cliente.repository';
import type { ClienteRepository } from '../../clientes/domain/cliente.repository';
import { PECA_REPOSITORY } from '../../pecas/domain/peca.repository';
import type { PecaRepository } from '../../pecas/domain/peca.repository';
import { SERVICO_REPOSITORY } from '../../servicos/domain/servico.repository';
import type { ServicoRepository } from '../../servicos/domain/servico.repository';
import { VEICULO_REPOSITORY } from '../../veiculos/domain/veiculo.repository';
import type { VeiculoRepository } from '../../veiculos/domain/veiculo.repository';
import { OrdemServico } from '../domain/ordem-servico.entity';
import { ORDEM_SERVICO_REPOSITORY } from '../domain/ordem-servico.repository';
import type {
  ListarOrdensServicoFiltro,
  OrdemServicoRepository,
} from '../domain/ordem-servico.repository';
import { StatusOrdemServico } from '../domain/status-ordem-servico.enum';

export interface ItemQuantidadeInput {
  id: string;
  quantidade: number;
}

export interface CriarOrdemServicoInput {
  clienteId: string;
  veiculoId: string;
  servicos: ItemQuantidadeInput[];
  pecas: ItemQuantidadeInput[];
}

export interface RegistrarDiagnosticoInput {
  observacao: string;
  servicosAdicionais: ItemQuantidadeInput[];
  pecasAdicionais: ItemQuantidadeInput[];
}

export interface TempoMedioExecucao {
  quantidadeOSFinalizadas: number;
  tempoMedioMinutos: number | null;
}

@Injectable()
export class OrdensServicoService {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject(CLIENTE_REPOSITORY)
    private readonly clienteRepository: ClienteRepository,
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculoRepository: VeiculoRepository,
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
    @Inject(PECA_REPOSITORY)
    private readonly pecaRepository: PecaRepository,
    private readonly emailService: EmailService,
  ) {}

  async abrir(input: CriarOrdemServicoInput): Promise<OrdemServico> {
    const cliente = await this.clienteRepository.buscarPorId(input.clienteId);
    if (!cliente) throw new EntityNotFoundException('Cliente', input.clienteId);

    const veiculo = await this.veiculoRepository.buscarPorId(input.veiculoId);
    if (!veiculo) throw new EntityNotFoundException('Veículo', input.veiculoId);
    if (veiculo.getClienteId() !== input.clienteId) {
      throw new DomainException(
        'O veículo informado não pertence ao cliente informado',
      );
    }

    const itensServico = await this.resolverItensServico(input.servicos);
    const itensPeca = await this.resolverItensPeca(input.pecas);

    const ordemServico = OrdemServico.abrir({
      id: randomUUID(),
      clienteId: input.clienteId,
      veiculoId: input.veiculoId,
      itensServico,
      itensPeca,
    });

    return this.ordemServicoRepository.salvar(ordemServico);
  }

  async iniciarDiagnostico(id: string): Promise<OrdemServico> {
    const ordemServico = await this.obter(id);
    ordemServico.iniciarDiagnostico();
    const salva = await this.ordemServicoRepository.salvar(ordemServico);
    await this.notificarClienteSobreStatus(
      salva,
      'Iniciamos o diagnóstico do seu veículo.',
    );
    return salva;
  }

  async registrarDiagnostico(
    id: string,
    input: RegistrarDiagnosticoInput,
  ): Promise<OrdemServico> {
    const ordemServico = await this.obter(id);

    const servicosAdicionais = await this.resolverItensServico(
      input.servicosAdicionais,
    );
    const pecasAdicionais = await this.resolverItensPeca(input.pecasAdicionais);

    ordemServico.registrarDiagnostico({
      observacao: input.observacao,
      itensServicoAdicionais: servicosAdicionais,
      itensPecaAdicionais: pecasAdicionais,
    });

    const salva = await this.ordemServicoRepository.salvar(ordemServico);
    await this.notificarClienteSobreStatus(
      salva,
      `O orçamento da sua OS está pronto: R$ ${salva.getValorTotal().toFixed(2)}. Acesse a consulta de status para aprovar ou recusar.`,
    );
    return salva;
  }

  async aprovarOrcamento(id: string, clienteId: string): Promise<OrdemServico> {
    const ordemServico = await this.obterValidandoCliente(id, clienteId);

    ordemServico.aprovarOrcamento();

    const itensPeca = ordemServico.getItensPeca();
    if (itensPeca.length > 0) {
      await this.pecaRepository.decrementarEstoqueTransacional(
        itensPeca.map((item) => ({
          pecaId: item.pecaId,
          quantidade: item.quantidade,
        })),
      );
    }

    const salva = await this.ordemServicoRepository.salvar(ordemServico);
    await this.notificarClienteSobreStatus(
      salva,
      'Orçamento aprovado! Seu veículo entrou em execução.',
    );
    return salva;
  }

  async recusarOrcamento(id: string, clienteId: string): Promise<OrdemServico> {
    const ordemServico = await this.obterValidandoCliente(id, clienteId);
    ordemServico.recusarOrcamento();
    const salva = await this.ordemServicoRepository.salvar(ordemServico);
    await this.notificarClienteSobreStatus(
      salva,
      'Recebemos a recusa do orçamento da sua OS.',
    );
    return salva;
  }

  async finalizar(id: string): Promise<OrdemServico> {
    const ordemServico = await this.obter(id);
    ordemServico.finalizar();
    const salva = await this.ordemServicoRepository.salvar(ordemServico);
    await this.notificarClienteSobreStatus(
      salva,
      'Seu veículo está pronto! A execução dos serviços foi finalizada.',
    );
    return salva;
  }

  async entregar(id: string): Promise<OrdemServico> {
    const ordemServico = await this.obter(id);
    ordemServico.entregar();
    const salva = await this.ordemServicoRepository.salvar(ordemServico);
    await this.notificarClienteSobreStatus(
      salva,
      'Veículo entregue. Obrigado por confiar na nossa oficina!',
    );
    return salva;
  }

  async obter(id: string): Promise<OrdemServico> {
    const ordemServico = await this.ordemServicoRepository.buscarPorId(id);
    if (!ordemServico) {
      throw new EntityNotFoundException('Ordem de Serviço', id);
    }
    return ordemServico;
  }

  /** Consulta usada pela rota do cliente (autenticado via JWT emitido pela Lambda de CPF). */
  async consultarStatus(id: string, clienteId: string): Promise<OrdemServico> {
    return this.obterValidandoCliente(id, clienteId);
  }

  async listar(
    filtro: ListarOrdensServicoFiltro,
  ): Promise<PaginatedResult<OrdemServico>> {
    return this.ordemServicoRepository.listar(filtro);
  }

  async tempoMedioExecucao(): Promise<TempoMedioExecucao> {
    const finalizadas = await this.ordemServicoRepository.listarFinalizadas();
    const tempos = finalizadas
      .map((os) => os.tempoExecucaoMinutos())
      .filter((tempo): tempo is number => tempo !== null);

    if (tempos.length === 0) {
      return {
        quantidadeOSFinalizadas: finalizadas.length,
        tempoMedioMinutos: null,
      };
    }

    const media = tempos.reduce((acc, tempo) => acc + tempo, 0) / tempos.length;
    return {
      quantidadeOSFinalizadas: finalizadas.length,
      tempoMedioMinutos: Math.round(media),
    };
  }

  /**
   * Notifica o cliente sobre a mudança de status via e-mail (requisito de
   * "atualização de status via ferramenta como e-mail"). Nunca lança: uma
   * falha no envio não pode reverter uma transição de status já persistida.
   */
  private async notificarClienteSobreStatus(
    ordemServico: OrdemServico,
    mensagem: string,
  ): Promise<void> {
    const cliente = await this.clienteRepository.buscarPorId(
      ordemServico.getClienteId(),
    );
    if (!cliente?.getEmail()) return;

    await this.emailService.enviarAtualizacaoDeStatus(
      cliente.getEmail(),
      `Atualização da sua Ordem de Serviço #${ordemServico.id.slice(0, 8)}`,
      mensagem,
    );
  }

  /** Garante que a OS pertence ao cliente autenticado (clienteId vem do JWT). */
  private async obterValidandoCliente(
    id: string,
    clienteId: string,
  ): Promise<OrdemServico> {
    const ordemServico = await this.obter(id);
    if (ordemServico.getClienteId() !== clienteId) {
      // 404 (não 403): não revela a um cliente que uma OS de outro cliente existe.
      throw new EntityNotFoundException('Ordem de Serviço', id);
    }
    return ordemServico;
  }

  private async resolverItensServico(itens: ItemQuantidadeInput[]) {
    if (itens.length === 0) return [];

    const servicos = await this.servicoRepository.buscarPorIds(
      itens.map((i) => i.id),
    );
    return itens.map((item) => {
      const servico = servicos.find((s) => s.id === item.id);
      if (!servico) throw new EntityNotFoundException('Serviço', item.id);
      return {
        servicoId: servico.id,
        nome: servico.getNome(),
        precoUnitario: servico.getPreco(),
        quantidade: item.quantidade,
      };
    });
  }

  private async resolverItensPeca(itens: ItemQuantidadeInput[]) {
    if (itens.length === 0) return [];

    const pecas = await this.pecaRepository.buscarPorIds(
      itens.map((i) => i.id),
    );
    return itens.map((item) => {
      const peca = pecas.find((p) => p.id === item.id);
      if (!peca) throw new EntityNotFoundException('Peça', item.id);
      if (!peca.temEstoqueSuficiente(item.quantidade)) {
        throw new InsufficientStockException(
          peca.getNome(),
          peca.getQuantidadeEstoque(),
          item.quantidade,
        );
      }
      return {
        pecaId: peca.id,
        nome: peca.getNome(),
        precoUnitario: peca.getPreco(),
        quantidade: item.quantidade,
      };
    });
  }
}

export { StatusOrdemServico };
