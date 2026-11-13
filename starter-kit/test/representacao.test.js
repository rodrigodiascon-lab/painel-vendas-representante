// Testes do dominio Representacao (adaptacao para representante comercial).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { autoMap } from '../public/assets/js/lib/automap.js';
import { computeAll } from '../public/assets/js/lib/metrics.js';
import { getTemplate, DOMAINS } from '../public/assets/js/templates/index.js';
import { template as rep } from '../public/assets/js/templates/representacao.js';
import { DOMAINS as SERVER_DOMAINS } from '../functions/lib/domains.mjs';
import { resolveDateSlot } from '../public/assets/js/dashboard.js';
import { dimensionSlots } from '../public/assets/js/lib/filters.js';

test('representacao esta registrado no browser e no servidor', () => {
  assert.ok(DOMAINS.includes('representacao'));
  assert.ok(SERVER_DOMAINS.includes('representacao'));
  assert.equal(getTemplate('representacao'), rep);
});

test('autoMap representacao: mapeia colunas tipicas de uma planilha de representante', () => {
  const columns = ['Data', 'Cliente', 'Representada', 'Linha', 'Valor', 'Status'];
  const map = autoMap(rep.slots, columns);
  assert.equal(map.data, 'Data');
  assert.equal(map.cliente, 'Cliente');
  assert.equal(map.representada, 'Representada');
  assert.equal(map.produto, 'Linha');
  assert.equal(map.valor, 'Valor');
  assert.equal(map.status, 'Status');
});

test('autoMap representacao: aceita sinonimos comuns (marca, fabrica, loja, valor do pedido)', () => {
  const map = autoMap(rep.slots, ['Data do pedido', 'Loja', 'Marca', 'Produto', 'Valor do pedido', 'Situação']);
  assert.equal(map.cliente, 'Loja');
  assert.equal(map.representada, 'Marca');
  assert.equal(map.produto, 'Produto');
  assert.equal(map.valor, 'Valor do pedido');
  assert.equal(map.status, 'Situação');
});

test('estrutura do template representacao', () => {
  assert.equal(rep.id, 'representacao');
  assert.equal(resolveDateSlot(rep), 'data');
  const req = rep.slots.filter((s) => s.required).map((s) => s.key).sort();
  assert.deepEqual(req, ['data', 'valor']);
  const keys = rep.metrics.map((m) => m.key);
  assert.equal(keys.length, new Set(keys).size, 'keys unicas');
  for (const m of rep.metrics) if (m.agg === 'derived') assert.equal(typeof m.compute, 'function', m.key);
  // base antes das derivadas que dependem dela
  assert.ok(keys.indexOf('pedidos') < keys.indexOf('ticket_medio'));
  assert.ok(keys.indexOf('faturamento') < keys.indexOf('ticket_medio'));
  assert.ok(keys.indexOf('pedidos') < keys.indexOf('conversao_cotacoes'));
  assert.ok(keys.indexOf('cotacoes_abertas') < keys.indexOf('conversao_cotacoes'));
  assert.ok(keys.indexOf('oportunidades') < keys.indexOf('conversao_cotacoes'));
  for (const item of rep.layout) {
    assert.ok(['kpi', 'timeseries', 'funnel', 'table', 'ranking'].includes(item.widget), item.widget);
  }
  const ts = rep.layout.find((l) => l.widget === 'timeseries');
  assert.equal(ts.props.dateSlot, rep.dateSlot);
  assert.equal(rep.primaryMetric, 'faturamento');
});

const colMap = { data: 'Data', cliente: 'Cliente', representada: 'Representada', produto: 'Linha', valor: 'Valor', status: 'Status' };
const rows = [
  { Data: '01/07/2026', Cliente: 'Loja A', Representada: 'Marca Alfa', Linha: 'Panelas', Valor: '1.000,00', Status: 'Faturado' },
  { Data: '02/07/2026', Cliente: 'Loja A', Representada: 'Marca Beta', Linha: 'Talheres', Valor: '500,00', Status: 'Pedido' },
  { Data: '03/07/2026', Cliente: 'Loja B', Representada: 'Marca Alfa', Linha: 'Panelas', Valor: '2.000,00', Status: 'Entregue' },
  { Data: '04/07/2026', Cliente: 'Loja C', Representada: 'Marca Alfa', Linha: 'Facas', Valor: '9.999,00', Status: 'Cancelado' },
  { Data: '05/07/2026', Cliente: 'Loja D', Representada: 'Marca Beta', Linha: 'Talheres', Valor: '700,00', Status: 'Cotação' },
  { Data: '06/07/2026', Cliente: 'Loja E', Representada: 'Marca Beta', Linha: 'Copos', Valor: '300,00', Status: 'Orçamento' },
];

test('metricas representacao: pedido valido exclui cancelado e cotacao', () => {
  const out = computeAll(rep.metrics, rows, colMap);
  assert.equal(out.pedidos, 3, 'Faturado + Pedido + Entregue');
  assert.equal(out.faturamento, 3500, 'soma so dos pedidos validos');
  assert.equal(out.ticket_medio, 3500 / 3);
  assert.equal(out.clientes_positivados, 2, 'Loja A e Loja B, distintos');
  assert.equal(out.mix_produtos, 2, 'Panelas e Talheres');
  assert.equal(out.cotacoes_abertas, 2, 'Cotação + Orçamento');
  assert.equal(out.oportunidades, 5, 'pedidos + cotacoes abertas');
  assert.equal(out.conversao_cotacoes, 3 / 5, 'pedidos / oportunidades');
});

test('metricas representacao: sem coluna de status, todas as linhas contam como pedido', () => {
  const semStatus = { ...colMap, status: null };
  const out = computeAll(rep.metrics, rows, semStatus);
  assert.equal(out.pedidos, rows.length);
  assert.equal(out.cotacoes_abertas, 0);
  assert.equal(out.clientes_positivados, 5);
  assert.equal(out.faturamento, 1000 + 500 + 2000 + 9999 + 700 + 300);
});

test('metricas representacao: planilha vazia nao quebra (zeros, sem NaN)', () => {
  const out = computeAll(rep.metrics, [], colMap);
  for (const [k, v] of Object.entries(out)) assert.ok(Number.isFinite(v) && v === 0, `${k} = ${v}`);
});

test('filtros: valor e data nao viram filtro; cliente, representada, linha e status viram', () => {
  const dims = dimensionSlots(rep).map((d) => (typeof d === 'string' ? d : d.key)).sort();
  assert.ok(!dims.includes('valor'), 'valor e coluna numerica');
  assert.ok(!dims.includes('data'), 'data e eixo de tempo');
  assert.deepEqual(dims, ['cliente', 'produto', 'representada', 'status']);
});

test('funil: oportunidades -> pedidos (nunca passa de 100%)', () => {
  const funil = rep.layout.find((l) => l.widget === 'funnel');
  assert.deepEqual(funil.props.steps.map((s) => s.metricKey), ['oportunidades', 'pedidos']);
  const out = computeAll(rep.metrics, rows, colMap);
  assert.ok(out.pedidos <= out.oportunidades);
});

test('grafico e rankings: somam so pedidos validos, sem cotacao nem cancelado', () => {
  const colMap = { data: 'Data', cliente: 'Cliente', representada: 'Rep', produto: 'Linha', valor: 'Valor', status: 'Status' };
  const rows = [
    { Data: '01/08/2026', Cliente: 'A', Rep: 'X', Linha: 'L1', Valor: '100,00', Status: 'Faturado' },
    { Data: '02/08/2026', Cliente: 'A', Rep: 'X', Linha: 'L1', Valor: '50,00', Status: 'Orçamento' },
    { Data: '03/08/2026', Cliente: 'B', Rep: 'Y', Linha: 'L2', Valor: '70,00', Status: 'Cancelado' },
  ];
  const linhas = rep.chartRows(rows, colMap);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].Status, 'Faturado');
});

test('layout: mostra cotacoes em aberto como KPI (conversao no funil) e rankings em reais', () => {
  const kpis = rep.layout.filter((i) => i.widget === 'kpi').map((i) => i.props.metricKey);
  assert.ok(kpis.includes('cotacoes_abertas'));
  assert.equal(kpis.length, 6);
  for (const r of rep.layout.filter((i) => i.widget === 'ranking')) assert.equal(r.props.format, 'currency');
});
