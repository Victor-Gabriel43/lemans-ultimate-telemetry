import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collect, decrypt, encrypt, parseSetup } from "./build-setups.mjs";

const SENHA = "senha-de-teste-123";

test("encrypt/decrypt devolve os mesmos bytes", () => {
  const original = Buffer.from(JSON.stringify({ a: "çãé", b: [1, 2, 3] }), "utf8");
  assert.deepEqual(decrypt(encrypt(original, SENHA), SENHA), original);
});

test("senha errada falha na autenticação do GCM", () => {
  const data = encrypt(Buffer.from("x"), SENHA);
  assert.throws(() => decrypt(data, "outra-senha-qualquer"));
});

test("parseSetup extrai sessão, versão e temporada", () => {
  const buf = Buffer.from('VehicleClassSetting="Ferrari_499P Hypercar WEC2025"\n[GENERAL]\n', "latin1");
  const s = parseSetup("HYPERCAR", "Ferrari 499P", "Spa", "HYMO 1.3.1 499P SPA CQ.svm", buf);
  assert.equal(s.sessao, "CQ");
  assert.equal(s.versao, "1.3.1");
  assert.equal(s.temporada, "WEC2025");
  assert.equal(parseSetup("HYPERCAR", "X", "Y", "HYMO2 V1.2.3 GR010 LM WR.svm", buf).versao, "1.2.3");
});

test("collect lê a árvore e aborta em nome fora do padrão", () => {
  const root = mkdtempSync(join(tmpdir(), "setups-"));
  try {
    const dir = join(root, "HYPERCAR", "Ferrari 499P", "Spa");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "HYMO 1.3.1 499P SPA CQ.svm"), "a");
    writeFileSync(join(dir, "HYMO 1.3.1 499P SPA WR.svm"), "b");
    const setups = collect(root);
    assert.equal(setups.length, 2);
    assert.deepEqual(setups.map((s) => s.sessao), ["CQ", "WR"]);

    writeFileSync(join(dir, "setup estranho.svm"), "c");
    assert.throws(() => collect(root), /nome fora do padrão/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
