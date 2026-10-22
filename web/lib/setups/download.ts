import type { Setup, SetupGroup } from "./catalog";

/** O build guarda o .svm em latin-1 (1 char = 1 byte): volta pros bytes originais sem passar por UTF-8. */
function svmBytes(s: Setup) {
  const bytes = new Uint8Array(s.conteudo.length);
  for (let i = 0; i < s.conteudo.length; i++) bytes[i] = s.conteudo.charCodeAt(i);
  return bytes;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSetup(s: Setup) {
  saveBlob(new Blob([svmBytes(s)], { type: "application/octet-stream" }), s.arquivo);
}

export async function downloadGroup(g: SetupGroup) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const s of g.setups) zip.file(s.arquivo, svmBytes(s));
  const name = [g.carro, g.pista, g.versao ? `HYMO ${g.versao}` : g.temporada].filter(Boolean).join(" - ");
  saveBlob(await zip.generateAsync({ type: "blob" }), `${name}.zip`);
}
