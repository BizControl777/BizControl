import React, { useEffect, useState } from "react";
import "./produtos.css";
import { useAuth } from "../context/useAuth";

const UNIDADES_SUPORTADAS = [
  { value: "unidade", label: "Unidade" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "litro", label: "Litro (L)" },
  { value: "metro", label: "Metro (m)" },
  { value: "caixa", label: "Caixa" },
  { value: "pacote", label: "Pacote" },
  { value: "peca", label: "Peça" },
];

const Produtos = () => {
  const { user, hasPermission } = useAuth();
  const [search, setSearch] = useState("");

  const [produtos, setProdutos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modo, setModo] = useState("add");

  const [form, setForm] = useState({
    id: null,
    nome: "",
    categoria: "",
    unidade_base: "unidade",
    quantidade_total: "",
    preco_compra_total: "",
    preco_venda_unitario: "",
  });

  // 🔥 CARREGAR DO SQLITE
  useEffect(() => {
    console.log("🔄 [Produtos] UseEffect inicial");
    console.log("window.api disponível?", !!window.api);
    console.log("window.api:", window.api);
    
    // Verificar se a API está disponível
    if (!window.api) {
      console.error("❌ [Produtos] window.api não está disponível!");
      console.log("📋 Propriedades de window:", Object.keys(window).slice(0, 20));
      alert("❌ ERRO CRÍTICO: API não foi inicializada!\n\n1. Feche a aplicação\n2. Execute: npm run start\n3. Aguarde o Electron abrir\n\nNÃO use 'npm run dev'");
      return;
    }
    
    console.log("✅ [Produtos] API disponível, carregando produtos...");
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const data = await window.api.getProdutos();
      console.log("📋 Produtos carregados:", data.length);
      setProdutos(data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  // 🔍 FILTRO
  const filtrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  // ➕ ABRIR ADD
  const abrirAdd = () => {
    console.log("📬 Abrindo modal de adicionar produto");
    setModo("add");
    setForm({
      id: null,
      nome: "",
      categoria: "",
      unidade_base: "unidade",
      quantidade_total: "",
      preco_compra_total: "",
      preco_venda_unitario: "",
    });
    setModalOpen(true);
    console.log("✅ Modal aberto");
  };

  // ✏️ ABRIR EDIT
  const abrirEdit = (produto) => {
    setModo("edit");
    setForm({
      ...produto,
      unidade_base: produto.unidade_base || "unidade",
      quantidade_total: Number(produto.quantidade_total ?? produto.stock ?? 0),
      preco_compra_total: Number(
        produto.preco_compra_total ??
          Number(produto.preco_custo || 0) * Number(produto.quantidade_total ?? produto.stock ?? 0)
      ),
      preco_venda_unitario: Number(produto.preco_venda_unitario ?? produto.preco_venda ?? produto.preco ?? 0),
    });
    setModalOpen(true);
  };

  // 📝 CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;

    let finalValue = value;
    if (["quantidade_total", "preco_compra_total", "preco_venda_unitario"].includes(name)) {
      const normalizedValue = value.replace(",", ".");
      finalValue = normalizedValue === "" ? "" : Number(normalizedValue);
    }

    setForm((prev) => ({ ...prev, [name]: finalValue }));
  };

  const custoUnitarioCalculado =
    Number(form.quantidade_total) > 0
      ? Number(form.preco_compra_total || 0) / Number(form.quantidade_total || 0)
      : 0;
  const unidadeLabelCurta =
    form.unidade_base === "kg"
      ? "kg"
      : form.unidade_base === "litro"
      ? "litro"
      : form.unidade_base === "metro"
      ? "metro"
      : form.unidade_base || "unidade";
  const receitaPotencial = Number(form.quantidade_total || 0) * Number(form.preco_venda_unitario || 0);
  const lucroPotencial = receitaPotencial - Number(form.preco_compra_total || 0);

  // 💾 SALVAR (ADD OU EDIT NO SQLITE)
  const handleSalvar = async () => {
    console.log("🔄 handleSalvar chamado");
    console.log("Form atual:", form);
    console.log("window.api disponível?", !!window.api);

    // Verificar se a API está disponível
    if (!window.api) {
      console.error("❌ window.api não está disponível");
      alert("❌ Erro: API não disponível!\n\nExecute: npm run start (não npm run dev)");
      return;
    }

    // Validar campos obrigatórios
    if (!form.nome || !form.nome.trim()) {
      console.warn("⚠️ Nome vazio");
      alert("O nome é obrigatório!");
      return;
    }
    const categoriaFinal = form.novaCategoria && form.novaCategoria.trim() ? form.novaCategoria.trim() : form.categoria;
    if (!categoriaFinal || !categoriaFinal.trim()) {
      console.warn("⚠️ Categoria vazia");
      alert("A categoria é obrigatória!");
      return;
    }
    if (!form.unidade_base) {
      alert("Selecione a unidade base do produto.");
      return;
    }
    if (!form.quantidade_total || isNaN(form.quantidade_total) || Number(form.quantidade_total) <= 0) {
      console.warn("⚠️ Quantidade total inválida:", form.quantidade_total);
      alert("A quantidade total deve ser maior que 0.");
      return;
    }
    if (
      form.preco_compra_total === "" ||
      form.preco_compra_total === null ||
      isNaN(form.preco_compra_total) ||
      Number(form.preco_compra_total) < 0
    ) {
      console.warn("⚠️ Preço de compra total inválido:", form.preco_compra_total);
      alert("O preço de compra total deve ser maior ou igual a 0.");
      return;
    }
    if (!form.preco_venda_unitario || isNaN(form.preco_venda_unitario) || Number(form.preco_venda_unitario) <= 0) {
      console.warn("⚠️ Preço de venda unitário inválido:", form.preco_venda_unitario);
      alert("O preço de venda unitário deve ser maior que 0.");
      return;
    }

    try {
      console.log("💾 Salvando produto:", form);
      
      if (modo === "add") {
        console.log("➕ Adicionando novo produto");
        const resultado = await window.api.addProduto({
          ...form,
          categoria: categoriaFinal,
          usuario_id: user.id,
          preco_custo: custoUnitarioCalculado,
          preco_venda: Number(form.preco_venda_unitario),
          preco: Number(form.preco_venda_unitario),
          stock: Number(form.quantidade_total),
        });
        console.log("✅ Produto adicionado:", resultado);
      } else {
        console.log("✏️ Atualizando produto");
        const resultado = await window.api.updateProduto({
          ...form,
          categoria: categoriaFinal,
          usuario_id: user.id,
          preco_custo: custoUnitarioCalculado,
          preco_venda: Number(form.preco_venda_unitario),
          preco: Number(form.preco_venda_unitario),
          stock: Number(form.quantidade_total),
        });
        console.log("✅ Produto atualizado:", resultado);
      }

      console.log("🚪 Fechando modal");
      setModalOpen(false);
      console.log("🔄 Recarregando produtos");
      await carregarProdutos();
      console.log("✅ Produto salvo com sucesso!");
      
      if (modo === "add") {
        alert("✅ Produto adicionado com sucesso!");
      } else {
        alert("✅ Produto atualizado com sucesso!");
      }
    } catch (err) {
      console.error("❌ Erro ao salvar:", err);
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  // 🗑️ DELETE SQLITE
  const handleDelete = async (id) => {
    if (!window.api) {
      alert("❌ Erro: API não disponível");
      return;
    }
    
    if (!window.confirm("Tens certeza que queres apagar?")) return;

    try {
      await window.api.deleteProduto({ id, usuario_id: user.id });
      await carregarProdutos(); // 🔥 atualiza lista
      alert("✅ Produto removido com sucesso!");
    } catch (err) {
      console.error("Erro ao apagar:", err);
      alert(`Erro ao apagar: ${err.message}`);
    }
  };

  // 📊 STOCK CLASS
  const getStockClass = (stock) => {
    if (stock <= 0) return "stock-danger";
    if (stock <= 5) return "stock-warning";
    return "stock-ok";
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Cadastrar Produtos
        </div>
        <div className="page-sub">Adicione novos produtos ao catálogo</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 18 }}>Novo Produto</div>
          <div className="form-row cols2">
            <div className="field">
              <label>Nome do Produto</label>
              <input
                id="p-nome"
                placeholder="ex: Sumo 500ml"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select
                id="p-cat"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                <option value="">Selecione ou digite nova</option>
                <option>Bebidas</option>
                <option>Alimentos</option>
                <option>Higiene</option>
                <option>Electrónica</option>
                <option>Vestuário</option>
                <option>Outros</option>
              </select>
            </div>
            <div className="field">
              <label>Nova Categoria (opcional)</label>
              <input
                placeholder="Digite nova categoria"
                value={form.novaCategoria || ""}
                onChange={(e) => setForm({ ...form, novaCategoria: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row cols3">
            <div className="field">
              <label>Unidade</label>
              <select
                value={form.unidade_base}
                onChange={(e) => setForm({ ...form, unidade_base: e.target.value })}
              >
                {UNIDADES_SUPORTADAS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Preço Venda (MT)</label>
              <input
                type="number"
                id="p-preco"
                placeholder="0.00"
                value={form.preco_venda_unitario}
                onChange={(e) => setForm({ ...form, preco_venda_unitario: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Custo Total (MT)</label>
              <input
                type="number"
                id="p-custo"
                placeholder="0.00"
                value={form.preco_compra_total}
                onChange={(e) => setForm({ ...form, preco_compra_total: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row cols2">
            <div className="field">
              <label>Lucro Potencial</label>
              <input
                type="text"
                value={`${lucroPotencial.toFixed(2)} MT`}
                readOnly
                style={{ background: "var(--bg2)", color: lucroPotencial >= 0 ? "var(--green)" : "var(--red)" }}
              />
            </div>
            <div className="field">
              <label>Margem (%)</label>
              <input
                type="text"
                value={form.preco_compra_total > 0 ? ((lucroPotencial / form.preco_compra_total) * 100).toFixed(2) + "%" : "0%"}
                readOnly
                style={{ background: "var(--bg2)" }}
              />
            </div>
          </div>
          <div className="form-row cols2">
            <div className="field">
              <label>Stock Mínimo</label>
              <input type="number" id="p-stockmin" placeholder="10" />
            </div>
            <div className="field">
              <label>Ícone (Font Awesome)</label>
              <input id="p-icon" placeholder="fa-box" maxLength="32" />
            </div>
          </div>
          <button className="btn btn-green" onClick={handleSalvar}>
            <i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Adicionar Produto
          </button>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Produtos Cadastrados ({produtos.length})</div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {produtos.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--sm-r)", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>
                    <i className="fa-solid fa-box"></i>
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>{p.categoria} • MT {p.preco}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-sm btn-amber" onClick={() => abrirEdit(p)}>+ Stock</button>
                  <button className="btn btn-sm btn-red" onClick={() => handleDelete(p.id)}>
                    <i className="fa-solid fa-trash" style={{ marginRight: 6 }}></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modo === "add" ? "Novo Produto" : "Editar Produto"}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols2">
                <div className="field">
                  <label>Nome do Produto</label>
                  <input
                    placeholder="ex: Sumo 500ml"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    <option value="">Selecione ou digite nova</option>
                    <option>Bebidas</option>
                    <option>Alimentos</option>
                    <option>Higiene</option>
                    <option>Electrónica</option>
                    <option>Vestuário</option>
                    <option>Outros</option>
                  </select>
                </div>
              </div>
              <div className="form-row cols3">
                <div className="field">
                  <label>Unidade</label>
                  <select
                    value={form.unidade_base}
                    onChange={(e) => setForm({ ...form, unidade_base: e.target.value })}
                  >
                    {UNIDADES_SUPORTADAS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Quantidade Total</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.quantidade_total}
                    onChange={handleChange}
                    name="quantidade_total"
                  />
                </div>
                <div className="field">
                  <label>Custo Total (MT)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.preco_compra_total}
                    onChange={handleChange}
                    name="preco_compra_total"
                  />
                </div>
              </div>
              <div className="form-row cols2">
                <div className="field">
                  <label>Preço Venda Unitário (MT)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.preco_venda_unitario}
                    onChange={handleChange}
                    name="preco_venda_unitario"
                  />
                </div>
                <div className="field">
                  <label>Lucro Potencial</label>
                  <input
                    type="text"
                    value={`${lucroPotencial.toFixed(2)} MT`}
                    readOnly
                    style={{ background: "var(--bg2)", color: lucroPotencial >= 0 ? "var(--green)" : "var(--red)" }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-gray" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-green" onClick={handleSalvar}>Salvar Produto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default Produtos;