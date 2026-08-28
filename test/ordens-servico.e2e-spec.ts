import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/shared/filters/domain-exception.filter';
import { UsuarioOrmEntity } from '../src/modules/auth/infrastructure/usuario.orm-entity';
import { gerarCpf, gerarPlaca } from './utils/gerar-cpf';

describe('Fluxo completo de Ordem de Serviço (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: string;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    jwtService = app.get(JwtService);

    const usuarioRepo = app.get<Repository<UsuarioOrmEntity>>(
      getRepositoryToken(UsuarioOrmEntity),
    );
    const email = `admin.e2e.${randomUUID()}@oficina.com`;
    const senha = 'SenhaForte123';
    await usuarioRepo.save(
      usuarioRepo.create({
        id: randomUUID(),
        nome: 'Admin E2E',
        email,
        senhaHash: await bcrypt.hash(senha, 10),
      }),
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha });
    jwt = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Simula o token que a Lambda `oficina-lambda-auth` (Fase 3) emitiria. */
  function tokenCliente(clienteId: string, documento: string): string {
    return jwtService.sign({ sub: clienteId, documento, tipo: 'cliente' });
  }

  it('rejeita acesso a rota administrativa sem token', async () => {
    await request(app.getHttpServer()).get('/clientes').expect(401);
  });

  it('rejeita acesso às rotas do cliente sem token', async () => {
    await request(app.getHttpServer())
      .get('/ordens-servico/qualquer-id/status')
      .expect(401);
  });

  it('rejeita acesso às rotas do cliente com token administrativo', async () => {
    await request(app.getHttpServer())
      .get('/ordens-servico/qualquer-id/status')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(401);
  });

  it('percorre o ciclo de vida completo: abertura -> diagnóstico -> aprovação -> execução -> entrega', async () => {
    const auth = { Authorization: `Bearer ${jwt}` };
    const documentoCliente = gerarCpf();

    const cliente = await request(app.getHttpServer())
      .post('/clientes')
      .set(auth)
      .send({
        nome: 'Cliente E2E',
        documento: documentoCliente,
        email: 'cliente.e2e@email.com',
        telefone: '11999990000',
      })
      .expect(201);

    const veiculo = await request(app.getHttpServer())
      .post('/veiculos')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        placa: gerarPlaca(),
        marca: 'VW',
        modelo: 'Gol',
        ano: 2021,
      })
      .expect(201);

    const servico = await request(app.getHttpServer())
      .post('/servicos')
      .set(auth)
      .send({
        nome: 'Troca de óleo',
        descricao: 'Troca de óleo e filtro',
        preco: 150,
        tempoEstimadoMinutos: 60,
      })
      .expect(201);

    const peca = await request(app.getHttpServer())
      .post('/pecas')
      .set(auth)
      .send({
        nome: 'Óleo 1L',
        preco: 30,
        quantidadeEstoque: 10,
        quantidadeMinima: 2,
      })
      .expect(201);

    const os = await request(app.getHttpServer())
      .post('/ordens-servico')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        veiculoId: veiculo.body.id,
        servicos: [{ id: servico.body.id, quantidade: 1 }],
        pecas: [{ id: peca.body.id, quantidade: 4 }],
      })
      .expect(201);

    expect(os.body.status).toBe('RECEBIDA');
    expect(os.body.valorTotal).toBe(270); // 150 + 4*30

    await request(app.getHttpServer())
      .patch(`/ordens-servico/${os.body.id}/iniciar-diagnostico`)
      .set(auth)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('EM_DIAGNOSTICO'));

    await request(app.getHttpServer())
      .patch(`/ordens-servico/${os.body.id}/diagnostico`)
      .set(auth)
      .send({
        observacao: 'Tudo certo, orçamento aprovado internamente',
        servicosAdicionais: [],
        pecasAdicionais: [],
      })
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('AGUARDANDO_APROVACAO'));

    // rota do cliente: autenticado via JWT emitido pela Lambda de CPF (Fase 3)
    const authCliente = {
      Authorization: `Bearer ${tokenCliente(cliente.body.id, documentoCliente)}`,
    };
    await request(app.getHttpServer())
      .get(`/ordens-servico/${os.body.id}/status`)
      .set(authCliente)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('AGUARDANDO_APROVACAO'));

    // aprovação pelo cliente -> deve baixar o estoque da peça
    await request(app.getHttpServer())
      .post(`/ordens-servico/${os.body.id}/aprovacao`)
      .set(authCliente)
      .send({ aprovado: true })
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('EM_EXECUCAO'));

    const pecaAposAprovacao = await request(app.getHttpServer())
      .get(`/pecas/${peca.body.id}`)
      .set(auth)
      .expect(200);
    expect(pecaAposAprovacao.body.quantidadeEstoque).toBe(6); // 10 - 4

    await request(app.getHttpServer())
      .patch(`/ordens-servico/${os.body.id}/finalizar`)
      .set(auth)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('FINALIZADA'));

    await request(app.getHttpServer())
      .patch(`/ordens-servico/${os.body.id}/entregar`)
      .set(auth)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('ENTREGUE'));
  });

  it('rejeita a aprovação do orçamento quando o cliente autenticado não é o dono da OS', async () => {
    const auth = { Authorization: `Bearer ${jwt}` };

    const cliente = await request(app.getHttpServer())
      .post('/clientes')
      .set(auth)
      .send({
        nome: 'Outro Cliente',
        documento: gerarCpf(),
        email: 'outro@email.com',
        telefone: '11988887777',
      })
      .expect(201);
    const veiculo = await request(app.getHttpServer())
      .post('/veiculos')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        placa: gerarPlaca(),
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2019,
      })
      .expect(201);
    const servico = await request(app.getHttpServer())
      .post('/servicos')
      .set(auth)
      .send({
        nome: 'Alinhamento',
        descricao: 'Alinhamento e balanceamento',
        preco: 90,
        tempoEstimadoMinutos: 40,
      })
      .expect(201);

    const os = await request(app.getHttpServer())
      .post('/ordens-servico')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        veiculoId: veiculo.body.id,
        servicos: [{ id: servico.body.id, quantidade: 1 }],
        pecas: [],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/ordens-servico/${os.body.id}/iniciar-diagnostico`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/ordens-servico/${os.body.id}/diagnostico`)
      .set(auth)
      .send({ observacao: 'ok', servicosAdicionais: [], pecasAdicionais: [] })
      .expect(200);

    const tokenDeOutroCliente = tokenCliente(randomUUID(), gerarCpf());
    await request(app.getHttpServer())
      .post(`/ordens-servico/${os.body.id}/aprovacao`)
      .set('Authorization', `Bearer ${tokenDeOutroCliente}`)
      .send({ aprovado: true })
      .expect(404);
  });

  it('rejeita a criação de OS com estoque de peça insuficiente', async () => {
    const auth = { Authorization: `Bearer ${jwt}` };

    const cliente = await request(app.getHttpServer())
      .post('/clientes')
      .set(auth)
      .send({
        nome: 'Cliente Estoque',
        documento: gerarCpf(),
        email: 'estoque@email.com',
        telefone: '11977776666',
      })
      .expect(201);
    const veiculo = await request(app.getHttpServer())
      .post('/veiculos')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        placa: gerarPlaca(),
        marca: 'Ford',
        modelo: 'Ka',
        ano: 2017,
      })
      .expect(201);
    const peca = await request(app.getHttpServer())
      .post('/pecas')
      .set(auth)
      .send({
        nome: 'Pastilha de freio',
        preco: 80,
        quantidadeEstoque: 1,
        quantidadeMinima: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/ordens-servico')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        veiculoId: veiculo.body.id,
        servicos: [],
        pecas: [{ id: peca.body.id, quantidade: 5 }],
      })
      .expect(422);
  });
});
