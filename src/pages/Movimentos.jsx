import React, { useEffect, useState } from "react";
import "./Movimentos.css";
import Layout from "../components/Layout";

const Movimentos = () => {
  const [movimentos, setMovimentos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    produto_id: "",
    tipo: "entrada",
    quantidade: "",
    observacao: ""
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
      const [movs, prods] = await Promise.all([
        window.api.getMovimentos(),
        window.api.getProdutos()
      ]);
      setMovimentos(movs);
      setProdutos(prods);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAbrirModal = async () => {
    setForm({ produto_id: "", tipo: "entrada", quantidade: "", observacao: "" });
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

    if (!produtoId || !Number.isInteger(produtoId) || produtoId <= 0) {
      alert("Selecione um produto válido.");
      return;
    }

    if (!quantidade || !Number.isInteger(quantidade) || quantidade <= 0) {
      alert("Informe uma quantidade válida (inteiro maior que 0).");
      return;
    }

    try {
      await window.api.addMovimento({
        produto_id: produtoId,
        tipo: form.tipo,
        quantidade,
        observacao: form.observacao || ""
      });
      setModalOpen(false);
      await carregarDados();
      alert("✅ Movimento registado com sucesso!");
    } catch (err) {
      console.error("Erro ao registar movimento:", err);
      alert(`❌ Erro ao registar movimento: ${err?.message || err}`);
    }
  };

  const filtrados = movimentos.filter(m => {
    return filtroTipo === "" || m.tipo === filtroTipo;
  });

  const getNomeProduto = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto ? produto.nome : "Produto desconhecido";
  };

  const getTipoClass = (tipo) => {
    return tipo === "entrada" ? "tipo-entrada" : "tipo-saida";
  };

  const formatarData = (dataStr) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString("pt-PT") + " " + data.toLocaleTimeString("pt-PT", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <div className="movimentos-container">
        <header className="topbar">
          <h2>Histórico de Movimentos</h2>
          <p>Registre e acompanhe todas as movimentações de stock</p>
        </header>

        <div className="movimentos-hero">
          <span className="hero-pill">Offline pronto</span>
          <p>Registre entradas e saídas de produtos, com histórico completo sincronizado localmente.</p>
        </div>

        <div className="movimentos-header">
          <button className="btn-add" onClick={handleAbrirModal}>
            + Novo Movimento
          </button>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>

        <div className="movimentos-stats">
          <div className="stat">
            <h4>Total Movimentos</h4>
            <p>{filtrados.length}</p>
          </div>
          <div className="stat">
            <h4>Entradas</h4>
            <p>{filtrados.filter(m => m.tipo === "entrada").length}</p>
          </div>
          <div className="stat">
            <h4>Saídas</h4>
            <p>{filtrados.filter(m => m.tipo === "saida").length}</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="movimentos-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
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
                      <span className={`tipo-badge ${getTipoClass(m.tipo)}`}>
                        {m.tipo === "entrada" ? "🔼 Entrada" : "🔽 Saída"}
                      </span>
                    </td>
                    <td className={getTipoClass(m.tipo)}>
                      {m.tipo === "entrada" ? "+" : "-"}{m.quantidade}
                    </td>
                    <td>{m.observacao || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#64748b" }}>
                    Nenhum movimento registado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Novo Movimento</h3>
              
              <label>Produto *</label>
              <select
                name="produto_id"
                value={form.produto_id}
                onChange={handleChange}
                className="modal-input"
              >
                <option value="">Selecione um produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              {produtos.length === 0 && (
                <p className="empty-state" style={{ marginTop: '0.5rem', color: '#cbd5e1' }}>
                  Nenhum produto disponível. Adicione produtos em "Produtos" primeiro.
                </p>
              )}

              <label>Tipo *</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                className="modal-input"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>

              <label>Quantidade *</label>
              <input
                type="number"
                name="quantidade"
                value={form.quantidade}
                onChange={handleChange}
                placeholder="Ex: 10"
                className="modal-input"
                min="1"
              />

              <label>Observação</label>
              <textarea
                name="observacao"
                value={form.observacao}
                onChange={handleChange}
                placeholder="Nota interna..."
                className="modal-input"
                rows="3"
              />

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button
                  className="btn-save"
                  onClick={handleSalvar}
                  disabled={produtos.length === 0}
                  style={produtos.length === 0 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  Registar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Movimentos;
