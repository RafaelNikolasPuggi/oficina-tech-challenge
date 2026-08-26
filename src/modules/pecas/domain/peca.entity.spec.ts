import {
  DomainException,
  InsufficientStockException,
} from '../../../shared/domain/exceptions';
import { Peca } from './peca.entity';

function criarPeca(
  overrides: Partial<{
    preco: number;
    quantidadeEstoque: number;
    quantidadeMinima: number;
  }> = {},
) {
  return Peca.criar({
    id: 'peca-1',
    nome: 'Filtro de óleo',
    preco: 45.9,
    quantidadeEstoque: 10,
    quantidadeMinima: 2,
    ...overrides,
  });
}

describe('Peca', () => {
  it('cria uma peça válida', () => {
    const peca = criarPeca();
    expect(peca.getQuantidadeEstoque()).toBe(10);
    expect(peca.estaAbaixoDoMinimo()).toBe(false);
  });

  it('rejeita preço negativo', () => {
    expect(() => criarPeca({ preco: -1 })).toThrow(DomainException);
  });

  it('rejeita estoque inicial negativo', () => {
    expect(() => criarPeca({ quantidadeEstoque: -1 })).toThrow(DomainException);
  });

  it('rejeita quantidade mínima negativa', () => {
    expect(() => criarPeca({ quantidadeMinima: -1 })).toThrow(DomainException);
  });

  it('rejeita nome vazio', () => {
    expect(() =>
      Peca.criar({
        id: 'peca-1',
        nome: '   ',
        preco: 10,
        quantidadeEstoque: 1,
        quantidadeMinima: 0,
      }),
    ).toThrow(DomainException);
  });

  it('atualizar altera nome, preço e quantidade mínima', () => {
    const peca = criarPeca();
    peca.atualizar({ nome: 'Filtro premium', preco: 60, quantidadeMinima: 3 });

    expect(peca.getNome()).toBe('Filtro premium');
    expect(peca.getPreco()).toBe(60);
    expect(peca.getQuantidadeMinima()).toBe(3);
  });

  it('atualizar rejeita preço negativo', () => {
    const peca = criarPeca();
    expect(() => peca.atualizar({ preco: -5 })).toThrow(DomainException);
  });

  it('atualizar rejeita quantidade mínima negativa', () => {
    const peca = criarPeca();
    expect(() => peca.atualizar({ quantidadeMinima: -5 })).toThrow(
      DomainException,
    );
  });

  it('ajustarEstoque soma uma entrada positiva', () => {
    const peca = criarPeca({ quantidadeEstoque: 10 });
    peca.ajustarEstoque(5);
    expect(peca.getQuantidadeEstoque()).toBe(15);
  });

  it('ajustarEstoque com delta negativo reduz o estoque', () => {
    const peca = criarPeca({ quantidadeEstoque: 10 });
    peca.ajustarEstoque(-4);
    expect(peca.getQuantidadeEstoque()).toBe(6);
  });

  it('ajustarEstoque lança InsufficientStockException se o resultado ficar negativo', () => {
    const peca = criarPeca({ quantidadeEstoque: 3 });
    expect(() => peca.ajustarEstoque(-5)).toThrow(InsufficientStockException);
    expect(peca.getQuantidadeEstoque()).toBe(3);
  });

  it('temEstoqueSuficiente reflete corretamente a quantidade disponível', () => {
    const peca = criarPeca({ quantidadeEstoque: 5 });
    expect(peca.temEstoqueSuficiente(5)).toBe(true);
    expect(peca.temEstoqueSuficiente(6)).toBe(false);
  });

  it('estaAbaixoDoMinimo detecta reposição necessária', () => {
    const peca = criarPeca({ quantidadeEstoque: 1, quantidadeMinima: 2 });
    expect(peca.estaAbaixoDoMinimo()).toBe(true);
  });
});
