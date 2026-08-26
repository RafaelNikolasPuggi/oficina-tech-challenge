import {
  EntityNotFoundException,
  InsufficientStockException,
} from '../../../shared/domain/exceptions';
import { Peca } from '../domain/peca.entity';
import type { PecaRepository } from '../domain/peca.repository';
import { PecasService } from './pecas.service';

describe('PecasService', () => {
  let pecaRepository: jest.Mocked<PecaRepository>;
  let service: PecasService;

  beforeEach(() => {
    pecaRepository = {
      salvar: jest.fn(async (peca) => peca),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(),
      listar: jest.fn(),
      remover: jest.fn(),
      decrementarEstoqueTransacional: jest.fn(),
    };
    service = new PecasService(pecaRepository);
  });

  it('cria uma peça no catálogo', async () => {
    const peca = await service.criar({
      nome: 'Filtro de óleo',
      preco: 45.9,
      quantidadeEstoque: 20,
      quantidadeMinima: 5,
    });
    expect(peca.getQuantidadeEstoque()).toBe(20);
  });

  it('ajusta o estoque somando uma entrada', async () => {
    const existente = Peca.criar({
      id: 'peca-1',
      nome: 'Filtro',
      preco: 10,
      quantidadeEstoque: 5,
      quantidadeMinima: 1,
    });
    pecaRepository.buscarPorId.mockResolvedValueOnce(existente);

    const atualizada = await service.ajustarEstoque('peca-1', 10);

    expect(atualizada.getQuantidadeEstoque()).toBe(15);
  });

  it('lança InsufficientStockException ao tentar remover mais estoque do que existe', async () => {
    const existente = Peca.criar({
      id: 'peca-1',
      nome: 'Filtro',
      preco: 10,
      quantidadeEstoque: 3,
      quantidadeMinima: 1,
    });
    pecaRepository.buscarPorId.mockResolvedValueOnce(existente);

    await expect(service.ajustarEstoque('peca-1', -10)).rejects.toThrow(
      InsufficientStockException,
    );
  });

  it('lança EntityNotFoundException ao ajustar estoque de peça inexistente', async () => {
    pecaRepository.buscarPorId.mockResolvedValueOnce(null);

    await expect(service.ajustarEstoque('inexistente', 1)).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('atualiza os dados cadastrais de uma peça existente', async () => {
    const existente = Peca.criar({
      id: 'peca-1',
      nome: 'Filtro',
      preco: 10,
      quantidadeEstoque: 5,
      quantidadeMinima: 1,
    });
    pecaRepository.buscarPorId.mockResolvedValueOnce(existente);

    const atualizada = await service.atualizar('peca-1', {
      nome: 'Filtro premium',
    });

    expect(atualizada.getNome()).toBe('Filtro premium');
  });

  it('listar delega para o repositório com a paginação informada', async () => {
    pecaRepository.listar.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await service.listar(1, 20);

    expect(pecaRepository.listar).toHaveBeenCalledWith(1, 20);
  });

  it('remover verifica a existência antes de remover', async () => {
    const existente = Peca.criar({
      id: 'peca-1',
      nome: 'Filtro',
      preco: 10,
      quantidadeEstoque: 5,
      quantidadeMinima: 1,
    });
    pecaRepository.buscarPorId.mockResolvedValueOnce(existente);

    await service.remover('peca-1');

    expect(pecaRepository.remover).toHaveBeenCalledWith('peca-1');
  });

  it('remover lança EntityNotFoundException se a peça não existir', async () => {
    pecaRepository.buscarPorId.mockResolvedValueOnce(null);

    await expect(service.remover('inexistente')).rejects.toThrow(
      EntityNotFoundException,
    );
    expect(pecaRepository.remover).not.toHaveBeenCalled();
  });
});
