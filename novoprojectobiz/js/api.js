// API Wrapper para comunicação com backend
// Este ficheiro abstrai a comunicação HTTP e IPC

class APIClient {
  constructor() {
    this.token = localStorage.getItem("auth_token");
    this.baseURL = window.electronAPI ? "http://localhost:3000/api" : "/api";
    this.isElectron = !!window.electronAPI;
  }

  // Definir token após login
  setToken(token) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  // Limpar token após logout
  clearToken() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  // Método genérico de requisição
  async request(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (this.token) {
        options.headers.Authorization = `Bearer ${this.token}`;
      }

      if (data) {
        options.body = JSON.stringify(data);
      }

      const url = `${this.baseURL}${endpoint}`;

      let response;
      if (this.isElectron && window.electronAPI) {
        // Usar IPC quando em Electron
        response = await window.electronAPI.request(method, endpoint, data);
      } else {
        // Usar fetch direto no browser
        response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Erro na requisição");
        }

        return result;
      }

      return response;
    } catch (error) {
      console.error(`[API] Erro em ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  // Métodos alias convenientes
  get(endpoint) {
    return this.request("GET", endpoint);
  }

  post(endpoint, data) {
    return this.request("POST", endpoint, data);
  }

  put(endpoint, data) {
    return this.request("PUT", endpoint, data);
  }

  delete(endpoint) {
    return this.request("DELETE", endpoint);
  }

  // ===== AUTENTICAÇÃO =====
  async login(email, senha) {
    const result = await this.post("/auth/login", { email, senha });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  logout() {
    this.clearToken();
  }

  // ===== PRODUTOS =====
  async getProdutos(empresaId) {
    return this.get(`/produtos?empresa_id=${empresaId}`);
  }

  async criarProduto(produto) {
    return this.post("/produtos", produto);
  }

  async atualizarProduto(id, dados) {
    return this.put(`/produtos/${id}`, dados);
  }

  async deletarProduto(id) {
    return this.delete(`/produtos/${id}`);
  }

  // ===== VENDAS =====
  async registarVenda(empresaId, itens, total) {
    return this.post("/vendas", { empresaId, itens, total });
  }

  async getVendas(empresaId) {
    return this.get(`/vendas?empresa_id=${empresaId}`);
  }

  // ===== RESERVAS =====
  async criarReserva(empresaId, produto_id, quantidade) {
    return this.post("/reservas", { empresaId, produto_id, quantidade });
  }

  async getReservas(empresaId) {
    return this.get(`/reservas?empresa_id=${empresaId}`);
  }

  async cancelarReserva(id) {
    return this.delete(`/reservas/${id}`);
  }

  // ===== DASHBOARD =====
  async getDashboardStats(empresaId) {
    return this.get(`/dashboard/stats?empresa_id=${empresaId}`);
  }
}

// Instância global
export const api = new APIClient();
