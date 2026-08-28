import {
  EntityNotFoundException,
  DomainException,
} from '../../../shared/domain/exceptions';
import { Cliente } from '../../clientes/domain/cliente.entity';
import type { ClienteRepository } from '../../clientes/domain/cliente.repository';
import { Peca } from '../../pecas/domain/peca.entity';
import type { PecaRepository } from '../../pecas/domain/peca.repository';
import { Servico } from '../../servicos/domain/servico.entity';
import type { ServicoRepository } from '../../servicos/domain/servico.repository';
import { Veiculo } from '../../veiculos/domain/veiculo.entity';
import type { VeiculoRepository } from '../../veiculos/domain/veiculo.repository';
import { OrdemServico } from '../domain/ordem-servico.entity';
import type { OrdemServicoRepository } from '../domain/ordem-servico.repository';
import { StatusOrdemServico } from '../domain/status-ordem-servico.enum';
import { OrdensServicoService } from './ordens-servico.service';

describe('OrdensServicoService', () => {
  const cliente = Cliente.criar({
    id: 'cliente-1',
    nome: 'Maria da Silva',
    documento: '111.444.777-35',
    email: 'maria@email.com',
    telefone: '11999998888',
  });

  const veiculo = Veiculo.criar({
    id: 'veiculo-1',
    clienteId: 'cliente-1',
    placa: 'ABC1234',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2020,
  });

  const servico = Servico.criar({
    id: 'servico-1',
    nome: 'Troca de óleo',
    descricao: 'Troca de óleo e filtro',
    preco: 150,
    tempoEstimadoMinutos: 60,
  });

  const peca = Peca.criar({
    id: 'peca-1',
    nome: 'Óleo 1L',
    preco: 30,
    quantidadeEstoque: 5,
    quantidadeMinima: 1,
  });

  let ordemServicoRepository: jest.Mocked<OrdemServicoRepository>;
  let clienteRepository: jest.Mocked<ClienteRepository>;
  let veiculoRepository: jest.Mocked<VeiculoRepository>;
  let servicoRepository: jest.Mocked<ServicoRepository>;
  let pecaRepository: jest.Mocked<PecaRepository>;
  let emailService: { enviarAtualizacaoDeStatus: jest.Mock };
  let service: OrdensServicoService;

  beforeEach(() => {
    ordemServicoRepository = {
      salvar: jest.fn(async (os) => os),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      listarFinalizadas: jest.fn(),
    };
    clienteRepository = {
      salvar: jest.fn(),
      buscarPorId: jest.fn(async (id) => (id === cliente.id ? cliente : null)),
      buscarPorDocumento: jest.fn(),
      listar: jest.fn(),
      remover: jest.fn(),
    };
    veiculoRepository = {
      salvar: jest.fn(),
      buscarPorId: jest.fn(async (id) => (id === veiculo.id ? veiculo : null)),
      buscarPorPlaca: jest.fn(),
      listarPorCliente: jest.fn(),
      listar: jest.fn(),
      remover: jest.fn(),
    };
    servicoRepository = {
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(async () => [servico]),
      listar: jest.fn(),
      remover: jest.fn(),
    };
    pecaRepository = {
      salvar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(async () => [peca]),
      listar: jest.fn(),
      remover: jest.fn(),
      decrementarEstoqueTransacional: jest.fn(),
    };

    emailService = {
      enviarAtualizacaoDeStatus: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrdensServicoService(
      ordemServicoRepository,
      clienteRepository,
      veiculoRepository,
      servicoRepository,
      pecaRepository,
      emailService as never,
    );
  });

  describe('abrir', () => {
    it('cria a OS quando cliente, veículo, serviços e peças são válidos', async () => {
      const os = await service.abrir({
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        servicos: [{ id: servico.id, quantidade: 1 }],
        pecas: [{ id: peca.id, quantidade: 2 }],
      });

      expect(os.getStatus()).toBe(StatusOrdemServico.RECEBIDA);
      expect(os.getValorTotal()).toBe(210); // 150*1 + 30*2
      expect(ordemServicoRepository.salvar).toHaveBeenCalledTimes(1);
    });

    it('lança EntityNotFoundException se o cliente não existir', async () => {
      await expect(
        service.abrir({
          clienteId: 'inexistente',
          veiculoId: veiculo.id,
          servicos: [],
          pecas: [],
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('lança DomainException se o veículo não pertencer ao cliente informado', async () => {
      const outroVeiculo = Veiculo.criar({
        id: 'veiculo-2',
        clienteId: 'outro-cliente',
        placa: 'XYZ9A87',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2018,
      });
      veiculoRepository.buscarPorId.mockResolvedValueOnce(outroVeiculo);

      await expect(
        service.abrir({
          clienteId: cliente.id,
          veiculoId: outroVeiculo.id,
          servicos: [],
          pecas: [],
        }),
      ).rejects.toThrow(DomainException);
    });

    it('lança DomainException quando o estoque da peça é insuficiente', async () => {
      await expect(
        service.abrir({
          clienteId: cliente.id,
          veiculoId: veiculo.id,
          servicos: [],
          pecas: [{ id: peca.id, quantidade: 999 }],
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('aprovarOrcamento', () => {
    function osAguardandoAprovacao(): OrdemServico {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [
          {
            pecaId: peca.id,
            nome: peca.getNome(),
            precoUnitario: 30,
            quantidade: 2,
          },
        ],
      });
      os.iniciarDiagnostico();
      os.registrarDiagnostico({
        observacao: 'ok',
        itensServicoAdicionais: [],
        itensPecaAdicionais: [],
      });
      return os;
    }

    it('aprova o orçamento e decrementa o estoque das peças da OS', async () => {
      const os = osAguardandoAprovacao();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      const resultado = await service.aprovarOrcamento(
        'os-1',
        '111.444.777-35',
      );

      expect(resultado.getStatus()).toBe(StatusOrdemServico.EM_EXECUCAO);
      expect(
        pecaRepository.decrementarEstoqueTransacional,
      ).toHaveBeenCalledWith([{ pecaId: peca.id, quantidade: 2 }]);
    });

    it('lança EntityNotFoundException quando o documento informado não é o dono da OS', async () => {
      const os = osAguardandoAprovacao();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      await expect(
        service.aprovarOrcamento('os-1', '529.982.247-25'),
      ).rejects.toThrow(EntityNotFoundException);
      expect(
        pecaRepository.decrementarEstoqueTransacional,
      ).not.toHaveBeenCalled();
    });
  });

  describe('ciclo de vida administrativo', () => {
    it('iniciarDiagnostico transiciona a OS para EM_DIAGNOSTICO', async () => {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      const resultado = await service.iniciarDiagnostico('os-1');

      expect(resultado.getStatus()).toBe(StatusOrdemServico.EM_DIAGNOSTICO);
    });

    it('registrarDiagnostico resolve itens adicionais do catálogo e atualiza o orçamento', async () => {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      os.iniciarDiagnostico();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      const resultado = await service.registrarDiagnostico('os-1', {
        observacao: 'Necessário trocar óleo',
        servicosAdicionais: [{ id: servico.id, quantidade: 1 }],
        pecasAdicionais: [{ id: peca.id, quantidade: 1 }],
      });

      expect(resultado.getStatus()).toBe(
        StatusOrdemServico.AGUARDANDO_APROVACAO,
      );
      expect(resultado.getValorTotal()).toBe(180); // 150 + 30
    });

    it('registrarDiagnostico lança EntityNotFoundException para serviço inexistente no catálogo', async () => {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      os.iniciarDiagnostico();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);
      servicoRepository.buscarPorIds.mockResolvedValueOnce([]);

      await expect(
        service.registrarDiagnostico('os-1', {
          observacao: 'ok',
          servicosAdicionais: [{ id: 'servico-inexistente', quantidade: 1 }],
          pecasAdicionais: [],
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('recusarOrcamento transiciona a OS para RECUSADA', async () => {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      os.iniciarDiagnostico();
      os.registrarDiagnostico({
        observacao: 'ok',
        itensServicoAdicionais: [],
        itensPecaAdicionais: [],
      });
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      const resultado = await service.recusarOrcamento(
        'os-1',
        '111.444.777-35',
      );

      expect(resultado.getStatus()).toBe(StatusOrdemServico.RECUSADA);
    });

    it('finalizar e entregar avançam a OS até o fim do fluxo', async () => {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      os.iniciarDiagnostico();
      os.registrarDiagnostico({
        observacao: 'ok',
        itensServicoAdicionais: [],
        itensPecaAdicionais: [],
      });
      os.aprovarOrcamento();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      const finalizada = await service.finalizar('os-1');
      expect(finalizada.getStatus()).toBe(StatusOrdemServico.FINALIZADA);

      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(finalizada);
      const entregue = await service.entregar('os-1');
      expect(entregue.getStatus()).toBe(StatusOrdemServico.ENTREGUE);
    });

    it('obter lança EntityNotFoundException quando a OS não existe', async () => {
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(null);

      await expect(service.obter('inexistente')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('consultarStatus devolve a OS quando o documento confere', async () => {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      const resultado = await service.consultarStatus('os-1', '111.444.777-35');

      expect(resultado.id).toBe('os-1');
    });

    it('listar delega para o repositório com o filtro informado', async () => {
      ordemServicoRepository.listar.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await service.listar({ page: 1, limit: 20 });

      expect(ordemServicoRepository.listar).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });
  });

  describe('notificação por e-mail ao cliente', () => {
    function osEmDiagnostico(): OrdemServico {
      const os = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      os.iniciarDiagnostico();
      return os;
    }

    it('envia e-mail ao registrar o diagnóstico', async () => {
      const os = osEmDiagnostico();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);

      await service.registrarDiagnostico('os-1', {
        observacao: 'ok',
        servicosAdicionais: [],
        pecasAdicionais: [],
      });

      expect(emailService.enviarAtualizacaoDeStatus).toHaveBeenCalledWith(
        cliente.getEmail(),
        expect.stringContaining(os.id.slice(0, 8)),
        expect.any(String),
      );
    });

    it('não lança erro quando o cliente não é encontrado ao notificar', async () => {
      const os = osEmDiagnostico();
      ordemServicoRepository.buscarPorId.mockResolvedValueOnce(os);
      clienteRepository.buscarPorId.mockResolvedValueOnce(null);

      await expect(
        service.registrarDiagnostico('os-1', {
          observacao: 'ok',
          servicosAdicionais: [],
          pecasAdicionais: [],
        }),
      ).resolves.toBeDefined();
      expect(emailService.enviarAtualizacaoDeStatus).not.toHaveBeenCalled();
    });
  });

  describe('tempoMedioExecucao', () => {
    it('calcula a média de tempo de execução entre as OS finalizadas', async () => {
      const os1 = OrdemServico.abrir({
        id: 'os-1',
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        itensServico: [],
        itensPeca: [],
      });
      os1.iniciarDiagnostico();
      os1.registrarDiagnostico({
        observacao: 'ok',
        itensServicoAdicionais: [],
        itensPecaAdicionais: [],
      });
      os1.aprovarOrcamento();

      jest.useFakeTimers().setSystemTime(new Date(Date.now() + 60 * 60_000));
      os1.finalizar();
      jest.useRealTimers();

      ordemServicoRepository.listarFinalizadas.mockResolvedValueOnce([os1]);

      const resultado = await service.tempoMedioExecucao();

      expect(resultado.quantidadeOSFinalizadas).toBe(1);
      expect(resultado.tempoMedioMinutos).toBeGreaterThanOrEqual(59);
    });

    it('retorna tempoMedioMinutos null quando não há OS finalizadas', async () => {
      ordemServicoRepository.listarFinalizadas.mockResolvedValueOnce([]);

      const resultado = await service.tempoMedioExecucao();

      expect(resultado.tempoMedioMinutos).toBeNull();
    });
  });
});
