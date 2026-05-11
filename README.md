# BizControl

Aplicação de gestão (stock, movimentos, clientes, fornecedores, relatórios e administração) em **Electron** + **React** + **SQLite** (`better-sqlite3`).

## Requisitos

- Node.js 20+ (recomendado para alinhar com o CI)
- npm

## Desenvolvimento

```bash
npm install
npm start
```

- O script `npm run electron` usa `scripts/run-electron.cjs` para **remover `ELECTRON_RUN_AS_NODE`** se estiver definido no ambiente (alguns IDEs definem isto e quebram o `require("electron")` no processo principal).
- Em **Linux**, o launcher acrescenta `--no-sandbox` / `--disable-setuid-sandbox` ao binário para evitar falha do helper `chrome-sandbox` em máquinas de desenvolvimento (não é usado no empacotamento Windows).
- Interface: Vite em `http://localhost:5174`
- Primeiro utilizador sem base existente: ecrã de registo. Em **desenvolvimento**, a senha mestre por defeito é `bizcontrol-dev-registration` (pode substituir com a variável `BIZCONTROL_MASTER_PASSWORD`).
- Pasta da base em runtime: dados de utilizador do sistema (`userData`), não dentro do repositório.

## Build de produção local

```bash
npm run build
npm run dist:win      # instalador NSIS para Windows (executar onde o tooling estiver disponível)
```

Antes do `dist`, para empacotes que serão distribuídos a clientes:

1. Crie **`electron/.registration-secret`** com uma só linha: a senha mestre para o primeiro registo (este ficheiro está no `.gitignore`).

   **Ou**

2. Defina `BIZCONTROL_MASTER_PASSWORD` no ambiente onde corre o empacotamento.

Sem um destes, o instalador poderá iniciar mas o primeiro registo devolverá erro até configurar a senha mestre.

## GitHub e artefacto `.exe`

- O fluxo [.github/workflows/build.yml](.github/workflows/build.yml) gera o instalador Windows e faz **upload** para **Actions → Artifacts** (`BizControl-Windows`, pasta `release`).
- Nos **Secrets** do repositório, crie **`BIZCONTROL_MASTER_PASSWORD`** com o valor que quer na senha mestre do instalador gerado pela CI.

`release/` e `*.exe` estão ignorados pelo Git por norma; distribua instaladores pelo GitHub Releases ou Artifact, não obrigatoriamente no histórico do código.

## Segurança (notas rápidas)

- O renderer corre com **isolamento de contexto** e **sem Node**; apenas a API em `preload` fala por IPC com o processo principal.
- Não inclua passwords reais no código-fonte nem em commits públicos.

## Licença

Uso conforme configurado pelo autor do projeto (`private` no `package.json`).
