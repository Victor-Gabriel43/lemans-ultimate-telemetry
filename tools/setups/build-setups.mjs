// Gera web/public/setups/data.enc a partir da pasta organizada de setups
// (<Classe>/<Carro>/<Pista>/*.svm). O conteúdo vai comprimido (gzip) e
// criptografado com AES-256-GCM; a chave sai da senha via PBKDF2-SHA256.
// O navegador faz o caminho inverso em web/lib/setups/crypto.ts — qualquer
// mudança no formato aqui precisa ser espelhada lá (e subir FORMAT_VERSION).
//
// Uso:
//   LMU_SENHA=... node tools/setups/build-setups.mjs --origem "<pasta>"
// A senha também pode vir de --senha ou do arquivo .env.setups.local na raiz
// do repo (linha LMU_SENHA=...). Esse arquivo está no .gitignore.

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

export const FORMAT_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSWORD_LENGTH = 12;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

export const CLASSES = ["HYPERCAR", "LMP2", "LMP3", "LMGT3"];
const SESSION_RE = /^[CEW][QR]$/;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = join(REPO_ROOT, "web", "public", "setups", "data.enc");

function listDirs(path) {
  return readdirSync(path).filter((n) => statSync(join(path, n)).isDirectory()).sort();
}

/** Extrai os metadados de um .svm a partir do nome e do conteúdo. */
export function parseSetup(classe, carro, pista, arquivo, buffer) {
  const base = arquivo.replace(/\.svm$/i, "");
  const tokens = base.split(/\s+/);
  const sessao = tokens.at(-1)?.toUpperCase() ?? "";
  if (!SESSION_RE.test(sessao)) return null;
  const versao = base.match(/^HYMO2?\s+V?(\d+(?:\.\d+)*)/i)?.[1] ?? "";
  // latin-1 preserva os bytes exatos (1 char = 1 byte) — o download no
  // navegador reconverte do mesmo jeito.
  const conteudo = buffer.toString("latin1");
  const temporada = conteudo.match(/VehicleClassSetting="[^"]*?((?:WEC|ELMS)\d{4})/)?.[1] ?? "";
  return { classe, carro, pista, temporada, versao, sessao, arquivo, conteudo };
}

/** Varre <origem>/<Classe>/<Carro>/<Pista>/*.svm. Lança erro listando tudo que estiver fora do padrão. */
export function collect(origem) {
  const setups = [];
  const problems = [];
  for (const classe of listDirs(origem)) {
    if (!CLASSES.includes(classe)) {
      problems.push(`classe desconhecida: ${classe}`);
      continue;
    }
    for (const carro of listDirs(join(origem, classe))) {
      for (const pista of listDirs(join(origem, classe, carro))) {
        const dir = join(origem, classe, carro, pista);
        for (const arquivo of readdirSync(dir).sort()) {
          if (!arquivo.toLowerCase().endsWith(".svm")) continue;
          const setup = parseSetup(classe, carro, pista, arquivo, readFileSync(join(dir, arquivo)));
          if (setup) setups.push(setup);
          else problems.push(`nome fora do padrão: ${join(classe, carro, pista, arquivo)}`);
        }
      }
    }
  }
  if (problems.length) throw new Error(`Build abortado:\n  ${problems.join("\n  ")}`);
  if (!setups.length) throw new Error(`Nenhum .svm encontrado em ${origem}`);
  return setups;
}

function deriveKey(password, salt) {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256");
}

/** versão(1) | salt(16) | iv(12) | ciphertext | tag(16) */
export function encrypt(plaintext, password) {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(password, salt), iv);
  const body = Buffer.concat([cipher.update(gzipSync(plaintext)), cipher.final()]);
  return Buffer.concat([Buffer.from([FORMAT_VERSION]), salt, iv, body, cipher.getAuthTag()]);
}

/** Inverso de encrypt — usado nos testes. Lança erro se a senha estiver errada. */
export function decrypt(data, password) {
  if (data[0] !== FORMAT_VERSION) throw new Error(`versão de formato desconhecida: ${data[0]}`);
  const salt = data.subarray(1, 1 + SALT_LEN);
  const iv = data.subarray(1 + SALT_LEN, 1 + SALT_LEN + IV_LEN);
  const body = data.subarray(1 + SALT_LEN + IV_LEN, data.length - TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(password, salt), iv);
  decipher.setAuthTag(data.subarray(data.length - TAG_LEN));
  return gunzipSync(Buffer.concat([decipher.update(body), decipher.final()]));
}

function readPassword(args) {
  const i = args.indexOf("--senha");
  if (i >= 0) return args[i + 1];
  if (process.env.LMU_SENHA) return process.env.LMU_SENHA;
  const envFile = join(REPO_ROOT, ".env.setups.local");
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("LMU_SENHA="));
    if (line) return line.slice("LMU_SENHA=".length).trim();
  }
  return undefined;
}

function main(args) {
  const i = args.indexOf("--origem");
  const origem = i >= 0 ? args[i + 1] : undefined;
  if (!origem || !existsSync(origem)) throw new Error("Informe a pasta organizada com --origem \"<pasta>\"");
  const password = readPassword(args);
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Senha ausente ou com menos de ${MIN_PASSWORD_LENGTH} caracteres (use LMU_SENHA, --senha ou .env.setups.local)`);
  }

  const setups = collect(origem);
  const json = JSON.stringify({ gerado_em: new Date().toISOString(), setups });
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, encrypt(Buffer.from(json, "utf8"), password));

  const porClasse = Object.fromEntries(CLASSES.map((c) => [c, setups.filter((s) => s.classe === c).length]));
  console.log(`data.enc gerado: ${setups.length} setups`, porClasse);
  console.log(`  ${OUTPUT} (${(statSync(OUTPUT).size / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
