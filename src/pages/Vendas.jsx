import React, { useEffect, useState } from "react";
import "./Movimentos.css";
import { useAuth } from "../context/useAuth";

const Vendas = () => {
  const { user } = useAuth();
  const [movimentos, setMovimentos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    produto_id: "",
    tipo: "venda",
    quantidade: "",
    observacao: "",
    preco_unitario: "",
    cliente_id: "",
    forma_pagamento: "dinheiro",
    status_pagamento: "pago",
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const [movs, prods, cls] = await Promise.all([
        window.api.getMovimentos(),
        window.api.getProdutos(),
        window.api.getClientes(),
      ]);
      setMovimentos(movs);
      setProdutos(prods);
      setClientes(cls);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "produto_id") {
        const produtoSelecionado = produtos.find((p) => Number(p.id) === Number(value));
        if (produtoSelecionado && prev.tipo === "venda") {
          next.preco_unitario = String(
            Number(produtoSelecionado.preco_venda_unitario || produtoSelecionado.preco_venda || produtoSelecionado.preco || 0)
          );
        }
      }
      return next;
    });
  };

  const handleAbrirModal = async () => {
    setForm({
      produto_id: "",
      tipo: "venda",
      quantidade: "",
      observacao: "",
      preco_unitario: "",
      cliente_id: "",
      forma_pagamento: "dinheiro",
      status_pagamento: "pago",
    });
    try {
      if (window.api) {
        const prods = await window.api.getProdutos();
        setProdutos(prods);
      }
    } catch (err) {
      console.error("Erro ao recarregar produtos:", err);
    }
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!window.api) {
      console.error("❌ window.api não está disponível");
      alert("Erro interno: API não disponível. Reinicie a aplicação.");
      return;
    }

    console.log("window.api methods:", Object.keys(window.api));
    if (typeof window.api.addMovimento !== "function") {
      console.error("❌ window.api.addMovimento não é uma função", window.api);
      alert("Erro interno: addMovimento não disponível. Abra o app via Electron para usar a API.");
      return;
    }

    const produtoId = Number(form.produto_id);
    const quantidade = Number(form.quantidade);
    const produtoSelecionado = produtos.find((p) => Number(p.id) === produtoId);

    if (!produtoId || !Number.isInteger(produtoId) || produtoId <= 0) {
      alert("Selecione um produto válido.");
      return;
    }

    if (form.tipo === "venda" && !form.cliente_id) {
      alert("Selecione um cliente para a venda.");
      return;
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      alert("Informe uma quantidade válida (maior que 0).");
      return;
    }

    if (form.tipo === "venda" && (!form.preco_unitario || Number(form.preco_unitario) <= 0)) {
      alert("Informe o preço unitário da venda.");
      return;
    }

    try {
      const payload = {
        produto_id: produtoId,
        tipo: form.tipo,
        quantidade,
        unidade: produtoSelecionado?.unidade_base || "unidade",
        observacao: form.observacao || "",
        preco_unitario: Number(form.preco_unitario || 0),
        cliente_id: form.cliente_id || null,
        forma_pagamento: form.forma_pagamento,
        status_pagamento: form.status_pagamento,
        usuario_id: user.id,
      };
      const result = await window.api.addMovimento(payload);
      setModalOpen(false);
      await carregarDados();
      if (form.tipo === "venda") {
        const total = quantidade * Number(form.preco_unitario || 0);
        const produto = produtos.find((p) => p.id === produtoId);
        const receiptWindow = window.open("", "_blank", "width=420,height=640");
        if (receiptWindow) {
          receiptWindow.document.write(`
            <html><body style="font-family: Arial; padding: 16px;">
              <h2>Recibo de Venda - BizControl</h2>
              <p><strong>Movimento:</strong> #${result.id}</p>
              <p><strong>Produto:</strong> ${produto?.nome || "-"}</p>
              <p><strong>Quantidade:</strong> ${quantidade} ${produto?.unidade_base || "unidade"}</p>
              <p><strong>Preco unitario:</strong> ${Number(form.preco_unitario || 0).toFixed(2)} MT</p>
              <p><strong>Total:</strong> ${total.toFixed(2)} MT</p>
              <p><strong>Pagamento:</strong> ${form.forma_pagamento} - ${form.status_pagamento}</p>
            </body></html>
          `);
          receiptWindow.document.close();
          receiptWindow.focus();
          receiptWindow.print();
        }
      }
      alert("✅ Movimento registado com sucesso!");
    } catch (err) {
      console.error("Erro ao registar movimento:", err);
      alert(`❌ Erro ao registar movimento: ${err?.message || err}`);
    }
  };

  const filtrados = movimentos.filter(m => m.tipo === "venda");

  const getNomeProduto = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto ? produto.nome : "Produto desconhecido";
  };

  const getTipoClass = (tipo) => {
    return tipo === "entrada" ? "tipo-entrada" : "tipo-saida";
  };

  const formatarData = (valor) => {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return String(valor);
    return data.toLocaleDateString("pt-PT") + " " + data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  };

  const fmt = (n) => "MT " + Number(n).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const produtoSelecionado = produtos.find((p) => Number(p.id) === Number(form.produto_id));
  const quantidadeDigitada = Number(form.quantidade || 0);
  const precoVendaDigitado = Number(form.preco_unitario || 0);
  const custoUnitarioAtual = produtoSelecionado
    ? Number(produtoSelecionado.custo_unitario || produtoSelecionado.preco_custo || 0)
    : 0;
  const totalVendaPreview = quantidadeDigitada > 0 ? quantidadeDigitada * precoVendaDigitado : 0;
  const lucroPreview =
    form.tipo === "venda" && quantidadeDigitada > 0 ? (precoVendaDigitado - custoUnitarioAtual) * quantidadeDigitada : 0;

  const stockAtual = produtoSelecionado ? Number(produtoSelecionado.quantidade_total ?? produtoSelecionado.stock ?? 0) : 0;
  const totalCompraEntrada = form.tipo === "entrada" ? totalVendaPreview : 0;
  const novoStockEntrada = form.tipo === "entrada" ? stockAtual + (quantidadeDigitada > 0 ? quantidadeDigitada : 0) : stockAtual;
  const precoCompraTotalAtual = produtoSelecionado ? Number(produtoSelecionado.preco_compra_total || 0) : 0;
  const novoPrecoCompraTotal = form.tipo === "entrada" ? precoCompraTotalAtual + totalCompraEntrada : precoCompraTotalAtual;
  const novoCustoUnitarioEntrada = novoStockEntrada > 0 ? novoPrecoCompraTotal / novoStockEntrada : custoUnitarioAtual;
  const precoVendaCatalogo = produtoSelecionado
    ? Number(produtoSelecionado.preco_venda_unitario || produtoSelecionado.preco_venda || produtoSelecionado.preco || 0)
    : 0;
  const lucroPotencialAdicionado =
    form.tipo === "entrada" && quantidadeDigitada > 0 ? (precoVendaCatalogo - novoCustoUnitarioEntrada) * quantidadeDigitada : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-cash-register" style={{ marginRight: 8 }}></i> Vendas
        </div>
        <div className="page-sub">Registo de vendas de produtos</div>
      </div>
      <div className="cards-row cols2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Total Vendas</div>
          <div className="metric">{filtrados.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Receita Total</div>
          <div className="metric green">{filtrados.reduce((sum, m) => sum + (m.quantidade * m.preco_unitario), 0).toFixed(2)} MT</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Histórico de Vendas</div>
          <button className="btn btn-sm btn-green" onClick={handleAbrirModal}>
            <i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Nova Venda / Entrada
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length > 0 ? (
                filtrados.map((m) => (
                  <tr key={m.id}>
                    <td>{formatarData(m.data)}</td>
                    <td>{getNomeProduto(m.produto_id)}</td>
                    <td>
                      <span className={`badge ${m.tipo === "entrada" ? "green" : "blue"}`}>
                        {m.tipo === "entrada" ? "Entrada" : "Venda"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: m.tipo === "entrada" ? "var(--green)" : "var(--blue)" }}>
                      {m.tipo === "entrada" ? "+" : "-"}{m.quantidade}
                    </td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {fmt(Number(m.preco_unitario || 0) * Number(m.quantidade || 0))}
                    </td>
                    <td style={{ color: "var(--text2)" }}>{m.observacao || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--text2)" }}>
                    Nenhum movimento registado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Novo Movimento</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Produto *</label>
                <select
                  name="produto_id"
                  value={form.produto_id}
                  onChange={handleChange}
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.unidade_base || "unidade"})
                    </option>
                  ))}
                </select>
              </div>
                      <div className="field">
                <label>Tipo *</label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                >
                  <option value="venda">Venda</option>
                  <option value="entrada">Entrada</option>
                </select>
              </div>
              {form.tipo === "venda" ? (
                <div className="field">
                  <label>Cliente *</label>
                  <select
                    name="cliente_id"
                    value={form.cliente_id}
                    onChange={handleChange}
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="field">
                <label>Quantidade *</label>
                <input
                  type="number"
                  name="quantidade"
                  value={form.quantidade}
                  onChange={handleChange}
                  placeholder="Ex: 2.5"
                  min="0.001"
                  step="0.001"
                />
              </div>
              <div className="field">
                <label>Preço Unitário</label>
                <input
                  type="number"
                  name="preco_unitario"
                  value={form.preco_unitario}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="field">
                <label>Total da Venda</label>
                <input
                  type="text"
                  readOnly
                  value={totalVendaPreview > 0 ? `${fmt(totalVendaPreview)} (${quantidadeDigitada} ${produtoSelecionado?.unidade_base || "unidade"})` : "-"}
                  style={{ background: "var(--bg2)" }}
                />
              </div>
              <div className="field">
                <label>Lucro estimado</label>
                <input
                  type="text"
                  readOnly
                  value={form.tipo === "venda" ? `${fmt(lucroPreview)} (${produtoSelecionado ? produtoSelecionado.unidade_base || "unidade" : "unidade"})` : "-"}
                  style={{ background: "var(--bg2)", color: lucroPreview >= 0 ? "var(--green)" : "var(--red)" }}
                />
              </div>
              <div className="field">
                <label>Observação</label>
                <textarea
                  name="observacao"
                  value={form.observacao}
                  onChange={handleChange}
                  placeholder="Nota interna..."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-green" onClick={handleSalvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendas;
