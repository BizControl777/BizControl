/**
 * Cálculos de lucro e margem para o formulário de produtos.
 */

export const UNIDADES_MEDIDA = [
  "Unidade",
  "Litros",
  "Kg",
  "Gramas",
  "Caixa",
  "Pacote",
  "Metro",
  "Tamanho",
  "Outros",
];

export function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Calcula métricas de lucro com base nos preços e quantidade por caixa.
 * @param {Object} params
 * @param {number} params.precoCompraCaixa - Preço total da caixa
 * @param {number} params.qtdPorCaixa - Unidades por caixa
 * @param {number} params.precoVendaUnidade - Preço de venda por unidade
 * @param {number} [params.precoVendaCaixa] - Preço de venda da caixa (opcional)
 */
export function calcularLucro({ precoCompraCaixa, qtdPorCaixa, precoVendaUnidade, precoVendaCaixa }) {
  const qtd = Math.max(1, safeNum(qtdPorCaixa, 1));
  const custoCaixa = safeNum(precoCompraCaixa);
  const precoUnit = safeNum(precoVendaUnidade);
  const precoCx = safeNum(precoVendaCaixa) > 0 ? safeNum(precoVendaCaixa) : precoUnit * qtd;

  const custoPorUnidade = qtd > 0 ? custoCaixa / qtd : 0;
  const lucroPorUnidade = precoUnit - custoPorUnidade;
  const lucroPorCaixa = precoCx - custoCaixa;
  const margemPercent =
    precoUnit > 0 ? Math.round((lucroPorUnidade / precoUnit) * 10000) / 100 : 0;

  return {
    custoPorUnidade: round2(custoPorUnidade),
    lucroPorUnidade: round2(lucroPorUnidade),
    lucroPorCaixa: round2(lucroPorCaixa),
    margemPercent,
    precoVendaCaixa: round2(precoCx),
    precoCustoUnidade: round2(custoPorUnidade),
  };
}

function round2(n) {
  return Math.round(safeNum(n) * 100) / 100;
}

/** Deriva preço de custo por unidade a partir do preço da caixa. */
export function custoUnitarioFromCaixa(precoCompraCaixa, qtdPorCaixa) {
  const qtd = Math.max(1, safeNum(qtdPorCaixa, 1));
  return round2(safeNum(precoCompraCaixa) / qtd);
}
