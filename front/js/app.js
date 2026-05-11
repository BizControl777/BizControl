import { destroyCharts } from "./utils.js";
import { showModal, closeModal } from "./paginas/helpers.js";
import * as vendedorPages from "./paginas/vendedor.js";
import * as gestorPages from "./paginas/gestor.js";
import * as superPages from "./paginas/super.js";

// Estado global
export const STATE = {
  role: "vendedor",
  user: null,
  currentPage: "",
  cart: [],
  charts: {},
};

// Callbacks para atualizar estado
let setProdutosCallback = null;
let setVendasCallback = null;
let currentProdutos = null;
let currentVendas = null;
let initVendedorPagesCallback = null;

export function setInitVendedorCallback(callback) {
  initVendedorPagesCallback = callback;
}

// Menus por role
const MENUS = {
  vendedor: [
    { id: "vender", icon: "<i class='fa-solid fa-credit-card'></i>", label: "Efectuar Venda" },
    { id: "produtos-v", icon: "<i class='fa-solid fa-box'></i>", label: "Produtos" },
    { id: "reservar", icon: "<i class='fa-solid fa-clipboard'></i>", label: "Reservar Produtos" }
  ],
  gestor: [
    { id: "dashboard", icon: "<i class='fa-solid fa-house'></i>", label: "Dashboard" },
    { id: "cadastrar", icon: "<i class='fa-solid fa-plus'></i>", label: "Cadastrar Produtos" },
    { id: "stock", icon: "<i class='fa-solid fa-box'></i>", label: "Nível de Stock" },
    { id: "financas", icon: "<i class='fa-solid fa-money-bill-wave'></i>", label: "Finanças" },
    { id: "ponto-venda", icon: "<i class='fa-solid fa-user-group'></i>", label: "Ponto de Venda" },
    { id: "estatisticas", icon: "<i class='fa-solid fa-chart-line'></i>", label: "Estatísticas" },
    { id: "reservas-g", icon: "<i class='fa-solid fa-clipboard'></i>", label: "Reservas" },
    { id: "definicoes", icon: "<i class='fa-solid fa-gear'></i>", label: "Definições" }
  ],
  super: [
    { id: "empresas", icon: "<i class='fa-solid fa-building'></i>", label: "Empresas" },
    { id: "subscricoes", icon: "<i class='fa-solid fa-credit-card'></i>", label: "Subscrições" },
    { id: "super-stats", icon: "<i class='fa-solid fa-chart-simple'></i>", label: "Estatísticas Globais" }
  ]
};

// Registro de páginas
export const PAGES = {
  // Vendedor
  vender: vendedorPages.renderVender,
  "produtos-v": vendedorPages.renderProdutosV,
  reservar: vendedorPages.renderReservar,
  // Gestor
  dashboard: gestorPages.renderDashboard,
  cadastrar: gestorPages.renderCadastrar,
  stock: gestorPages.renderStock,
  financas: gestorPages.renderFinancas,
  "ponto-venda": gestorPages.renderPontoVenda,
  estatisticas: gestorPages.renderEstatisticas,
  "reservas-g": gestorPages.renderReservasG,
  definicoes: gestorPages.renderDefinicoes,
  // Super
  empresas: superPages.renderEmpresas,
  subscricoes: superPages.renderSubscricoes,
  "super-stats": superPages.renderSuperStats
};

export function setDataCallbacks(produtos, setProdutos, vendas, setVendas) {
  currentProdutos = produtos;
  setProdutosCallback = setProdutos;
  currentVendas = vendas;
  setVendasCallback = setVendas;
}

const mapUserRole = (user) => {
  if (!user) return "vendedor";
  if (user.perfil === "admin") return "super";
  if (Array.isArray(user.permissoes) && user.permissoes.includes("criar_produto")) return "gestor";
  return "vendedor";
};

export async function doLogin() {
  const email = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value.trim();
  if (!email || !password) {
    alert("Informe email e senha para entrar.");
    return;
  }

  if (!window.api?.authLogin) {
    alert("API Electron não disponível. Execute o app via Electron.");
    return;
  }

  try {
    const user = await window.api.authLogin({ email, password });
    STATE.user = user;
    STATE.role = mapUserRole(user);
    document.getElementById("topbar-username").textContent = user.nome;
    document.getElementById("topbar-userrole").textContent = STATE.role === "super" ? "Super Utilizador" : STATE.role === "gestor" ? "Gestor" : "Vendedor";
    document.getElementById("topbar-avatar").textContent = user.nome.split(" ").map((x) => x[0]).slice(0, 2).join("");
    document.getElementById("topbar-company").textContent = user.email;
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");

    if (initVendedorPagesCallback) {
      await initVendedorPagesCallback(user);
    }
    buildSidebar();
  } catch (error) {
    console.error("Falha ao autenticar:", error);
    alert(error?.message || "Não foi possível autenticar.");
  }
}

export function logout() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-shell").classList.add("hidden");
  STATE.cart = [];
  STATE.charts = destroyCharts(STATE.charts);
}

export function buildSidebar() {
  const sb = document.getElementById("sidebar");
  const items = MENUS[STATE.role] || MENUS.vendedor;
  sb.innerHTML = '<div class="nav-section">Menu</div>';
  items.forEach((m) => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.id = "nav-" + m.id;
    div.innerHTML = `<span class="nav-icon">${m.icon}</span><span>${m.label}</span>`;
    div.onclick = () => navigateTo(m.id);
    sb.appendChild(div);
  });
  navigateTo(items[0].id);
}

export function navigateTo(page) {
  STATE.currentPage = page;
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  const ni = document.getElementById("nav-" + page);
  if (ni) ni.classList.add("active");
  STATE.charts = destroyCharts(STATE.charts);
  const ca = document.getElementById("content-area");
  ca.innerHTML = "";
  if (PAGES[page]) {
    PAGES[page](ca);
  }
}

window.STATE = STATE;
window.navigateTo = navigateTo;
window.doLogin = doLogin;
window.logout = logout;
window.closeModal = closeModal;
window.showModalWrapper = showModal;
