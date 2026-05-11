/**
 * Garante que o processo principal é o Electron real (não Node com ELECTRON_RUN_AS_NODE).
 * Alguns ambientes (IDEs, CI) exportam ELECTRON_RUN_AS_NODE=1 e partem o require("electron").
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const electronExe = require("electron");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = [...(process.platform === "linux" ? ["--disable-setuid-sandbox", "--no-sandbox"] : []), "."];
const child = spawn(electronExe, args, {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("close", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
