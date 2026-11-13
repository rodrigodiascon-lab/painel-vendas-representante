// Lógica pura de conversão de link do Google Sheets, compartilhada pelos
// conectores e pelo Worker de snapshot. Sem rede, sem estado global, sem
// dependências externas. Testável em node:test.
//
// Manter esta função em um único lugar evita drift: o handler de Pages
// (functions/api/connectors/sheets.js) e o Worker de snapshot
// (workers/snapshot/src/index.js) importam daqui a MESMA lógica.

/**
 * Converte um link de planilha Google no endpoint gviz que devolve CSV.
 * Extrai o ID do trecho /spreadsheets/d/{ID}/ do link.
 * @param {string} url   link completo da planilha
 * @param {string} [gid] aba (gid); vazio ou '0' usa a aba do proprio link, se houver
 * @returns {string} endpoint gviz que responde CSV
 * @throws {Error} se o link não contiver um ID de planilha válido
 */
export function sheetUrlToCsv(url, gid = '0') {
  const match = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Link de planilha Google inválido. Cole o link completo da planilha.');
  }
  const id = match[1];
  // Aba: o gid informado (campo do assistente) vale quando é diferente de '0';
  // senão, a aba que está no próprio link (#gid=, ?gid= ou &gid=); senão, 0.
  const informado = String(gid == null ? '' : gid).trim();
  if (informado && !/^\d+$/.test(informado)) {
    throw new Error('gid da aba inválido: use só números (o valor depois de gid= no link).');
  }
  const doLink = (String(url).match(/[#?&]gid=(\d+)(?=$|[&#])/) || [])[1];
  const aba = informado && informado !== '0' ? informado : doLink || '0';
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${aba}`;
}
