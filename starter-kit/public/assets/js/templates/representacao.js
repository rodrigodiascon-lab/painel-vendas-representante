// Template de dominio: Representacao comercial.
// Adaptacao para representante comercial (representante.ia), feita a partir do
// template de Vendas do criador-dash (Julio Couto, licenca MIT).
// Slots semanticos, metricas (base antes das derivadas) e layout. ESM, sem dependencias.

import { parseNumberBR } from '../lib/format.js';

// Status que NAO sao pedido fechado.
const CANCELADO = /cancel|devolv|recusad|perdid/i;
const COTACAO = /cota|orcam|propost|negocia|aberto|pendente/i;

function statusDe(r, colMap) {
  const col = colMap && colMap.status;
  if (!col) return '';
  // sem acento e sem cedilha: "Orçamento" e "Cotação" casam com as regras acima
  return String(r[col] == null ? '' : r[col]).trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Pedidos validos: tudo que nao e cancelado nem cotacao/orcamento.
// Sem coluna de status mapeada (ou sem nenhum status preenchido), todas as linhas contam.
function pedidosValidos(rows, colMap) {
  if (!colMap || !colMap.status) return rows;
  if (!rows.some((r) => statusDe(r, colMap))) return rows;
  return rows.filter((r) => {
    const s = statusDe(r, colMap);
    return !CANCELADO.test(s) && !COTACAO.test(s);
  });
}

function cotacoesAbertas(rows, colMap) {
  if (!colMap || !colMap.status) return [];
  return rows.filter((r) => COTACAO.test(statusDe(r, colMap)) && !CANCELADO.test(statusDe(r, colMap)));
}

function somaValor(rows, colMap) {
  const col = (colMap && colMap.valor) || 'valor';
  return rows.reduce((acc, r) => {
    const n = parseNumberBR(r[col]);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function distintos(rows, colMap, slot) {
  const col = colMap && colMap[slot];
  if (!col) return 0;
  const set = new Set();
  for (const r of rows) {
    const v = String(r[col] == null ? '' : r[col]).trim().toLowerCase();
    if (v) set.add(v);
  }
  return set.size;
}

export const template = {
  id: 'representacao',
  label: 'Representação comercial',
  primaryMetric: 'faturamento',
  dateSlot: 'data',
  // Grafico e rankings somam so pedidos validos, como o faturamento.
  chartRows: (rows, colMap) => pedidosValidos(rows, colMap),
  slots: [
    { key: 'data', label: 'Data', required: true, aliases: ['data', 'dia', 'date', 'data do pedido', 'emissao', 'data de emissao'] },
    { key: 'cliente', label: 'Cliente', required: false, aliases: ['cliente', 'loja', 'comprador', 'razao social', 'cliente final', 'customer'] },
    { key: 'representada', label: 'Representada', required: false, aliases: ['representada', 'marca', 'fabrica', 'fornecedor', 'industria', 'empresa representada'] },
    { key: 'produto', label: 'Linha / produto', required: false, aliases: ['linha', 'produto', 'item', 'familia', 'categoria', 'sku'] },
    { key: 'valor', label: 'Valor', required: true, aliases: ['valor', 'valor do pedido', 'valor total', 'total', 'faturamento', 'preco', 'amount'] },
    { key: 'status', label: 'Status', required: false, aliases: ['status', 'situacao', 'etapa', 'stage'] },
  ],
  metrics: [
    // Pedidos validos (nem cancelado, nem cotacao).
    { key: 'pedidos', label: 'Pedidos', agg: 'derived', format: 'integer', betterWhen: 'higher',
      compute: ({ rows, colMap }) => pedidosValidos(rows, colMap).length },
    // column: 'valor' marca o slot como numerico (assim ele nao vira filtro na barra).
    { key: 'faturamento', label: 'Faturamento', agg: 'derived', column: 'valor', format: 'currency', betterWhen: 'higher',
      compute: ({ rows, colMap }) => somaValor(pedidosValidos(rows, colMap), colMap) },
    // Clientes positivados: clientes distintos com pelo menos um pedido valido no periodo.
    { key: 'clientes_positivados', label: 'Clientes positivados', agg: 'derived', format: 'integer', betterWhen: 'higher',
      compute: ({ rows, colMap }) => distintos(pedidosValidos(rows, colMap), colMap, 'cliente') },
    // Mix: linhas/produtos distintos vendidos no periodo.
    { key: 'mix_produtos', label: 'Mix de linhas', agg: 'derived', format: 'integer', betterWhen: 'higher',
      compute: ({ rows, colMap }) => distintos(pedidosValidos(rows, colMap), colMap, 'produto') },
    { key: 'ticket_medio', label: 'Ticket médio', agg: 'derived', format: 'currency', betterWhen: 'higher',
      compute: ({ computed }) => (computed.pedidos ? computed.faturamento / computed.pedidos : 0) },
    { key: 'cotacoes_abertas', label: 'Cotações em aberto', agg: 'derived', format: 'integer',
      compute: ({ rows, colMap }) => cotacoesAbertas(rows, colMap).length },
    // Oportunidades: pedidos + cotacoes em aberto (base do funil).
    { key: 'oportunidades', label: 'Oportunidades', agg: 'derived', format: 'integer',
      compute: ({ computed }) => computed.pedidos + computed.cotacoes_abertas },
    // Conversao: pedidos sobre oportunidades.
    { key: 'conversao_cotacoes', label: 'Conversão de cotações', agg: 'derived', format: 'percent', betterWhen: 'higher',
      compute: ({ computed }) => (computed.oportunidades ? computed.pedidos / computed.oportunidades : 0) },
  ],
  layout: [
    { widget: 'kpi', props: { metricKey: 'faturamento' } },
    { widget: 'kpi', props: { metricKey: 'pedidos' } },
    { widget: 'kpi', props: { metricKey: 'clientes_positivados' } },
    { widget: 'kpi', props: { metricKey: 'ticket_medio' } },
    { widget: 'kpi', props: { metricKey: 'mix_produtos' } },
    { widget: 'kpi', props: { metricKey: 'cotacoes_abertas' } },
    { widget: 'timeseries', col: 8, props: { dateSlot: 'data', valueSlot: 'valor', title: 'Vendas no tempo' } },
    // a conversao (pedidos / oportunidades) aparece no funil; 6 KPIs cabem numa linha no desktop
    { widget: 'funnel', col: 4, props: { title: 'Oportunidades que viraram pedido', steps: [
      { label: 'Oportunidades', metricKey: 'oportunidades' },
      { label: 'Pedidos', metricKey: 'pedidos' },
    ] } },
    { widget: 'ranking', col: 6, props: { dimensionSlot: 'cliente', valueSlot: 'valor', format: 'currency', title: 'Ranking por cliente' } },
    { widget: 'ranking', col: 6, props: { dimensionSlot: 'representada', valueSlot: 'valor', format: 'currency', title: 'Ranking por representada' } },
    { widget: 'ranking', col: 12, props: { dimensionSlot: 'produto', valueSlot: 'valor', format: 'currency', title: 'Ranking por linha' } },
    { widget: 'table', col: 12, props: {} },
  ],
};
