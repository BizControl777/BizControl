import React, { useState, useEffect } from "react";

const InventoryTable = () => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filter, setFilter] = useState({ categoria: '', status: '', search: '' });
  const [data, setData] = useState([]);

  // Carregar produtos do banco ao montar
  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const produtos = await window.api.getProdutos();
      // Mapear produtos com status baseado no stock
      const produtosComStatus = produtos.map(p => ({
        ...p,
        name: 'nome',
        produto: p.nome,
        status: getStatusFromStock(p.stock)
      }));
      setData(produtosComStatus);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  const getStatusFromStock = (stock) => {
    if (stock <= 0) return 'out';
    if (stock <= 5) return 'low';
    return 'ok';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setData(sortedData);
  };

  const filteredData = data.filter(item => {
    return (
      (filter.categoria === '' || item.categoria === filter.categoria) &&
      (filter.status === '' || item.status === filter.status) &&
      (filter.search === '' || item.produto.toLowerCase().includes(filter.search.toLowerCase()))
    );
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ok': return 'OK';
      case 'low': return 'BAIXO';
      case 'out': return 'ESGOTADO';
      default: return 'DESCONHECIDO';
    }
  };

  const categories = [...new Set(data.map(item => item.categoria || 'Sem categoria'))];
  const statuses = ['ok', 'low', 'out'];

  return (
    <section className="table-box">
      <div className="table-header">
        <h3>Inventário</h3>
        <div className="filters">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={filter.search}
            onChange={(e) => setFilter({...filter, search: e.target.value})}
            className="search-input"
          />
          <select
            value={filter.categoria}
            onChange={(e) => setFilter({...filter, categoria: e.target.value})}
            className="filter-select"
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            {statuses.map(stat => <option key={stat} value={stat}>{getStatusLabel(stat)}</option>)}
          </select>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('id')}>ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => handleSort('produto')}>Produto {sortConfig.key === 'produto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => handleSort('categoria')}>Categoria {sortConfig.key === 'categoria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => handleSort('preco')}>Preço {sortConfig.key === 'preco' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => handleSort('stock')}>Quantidade {sortConfig.key === 'stock' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
            <th>Valor Total</th>
            <th onClick={() => handleSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.produto}</td>
              <td>{item.categoria}</td>
              <td>{item.preco} MT</td>
              <td>{item.stock}</td>
              <td className="valor-total">{(item.stock * item.preco).toLocaleString()} MT</td>
              <td>
                <span className={`status-chip ${item.status}`}>
                  {getStatusLabel(item.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default InventoryTable;