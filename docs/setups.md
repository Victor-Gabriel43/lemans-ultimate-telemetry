# Setup Library (`/setups`)

Catálogo privado de setups (`.svm`) do Le Mans Ultimate para o grupo. Só serve para navegar e baixar, sem login nem backend. O acesso é por **uma senha compartilhada**.

> **Estado atual: SEM senha.** Enquanto o design/UX não está fechado, o catálogo é publicado aberto (`web/public/setups/data.json`, gerado com `--sem-senha`) e a página entra direto. **Qualquer pessoa com a URL baixa todos os setups.** Para religar a senha: rode o build sem `--sem-senha` (ele gera o `data.enc` e apaga o `data.json`), commit e push.
>
> ```bash
> npm run setups:build -- --origem "<pasta organizada>" --sem-senha   # aberto
> npm run setups:build -- --origem "<pasta organizada>"               # com senha
> ```

## Como funciona

- `tools/setups/build-setups.mjs` lê a pasta organizada `<Classe>/<Carro>/<Pista>/*.svm`, monta um JSON, comprime com gzip e criptografa com **AES-256-GCM**. A chave é derivada da senha com PBKDF2-SHA256 em 600 mil iterações. O resultado é o `web/public/setups/data.enc`, publicado junto com o site.
- A página `web/app/setups` baixa o `data.enc`, pede a senha e descriptografa **no navegador** (WebCrypto). Sem a senha certa, o arquivo publicado é ilegível.
- Formato do `data.enc`: `versão(1) | salt(16) | iv(12) | ciphertext | tag(16)`. Os parâmetros estão duplicados em `tools/setups/build-setups.mjs` e `web/lib/setups/crypto.ts`. Mudou um, mude o outro e suba `FORMAT_VERSION`.
- "Lembrar neste aparelho" guarda a **chave derivada** (nunca a senha) no `localStorage`. Quando a senha é trocada, o salt muda e a chave salva deixa de valer sozinha.

## Atualizar os setups ou trocar a senha

A senha fica em `.env.setups.local`, na raiz do repo, na linha `LMU_SENHA=...`. O arquivo está no `.gitignore`, então **nunca é commitado**. Use no mínimo 12 caracteres.

```bash
npm run setups:build -- --origem "C:/Users/VICTOR GABRIEL/Downloads/SETUP LMU/SETUP LMU ORGANIZADO"
npm run setups:test
git add web/public/setups/data.enc && git commit -m "chore: atualiza setups" && git push
```

O push na `main` dispara o deploy da Vercel.

A pasta de origem é gerada pelo script de organização, que extrai os zips, deduplica e separa por classe, carro e pista a partir do `VehicleClassSetting` de cada `.svm`. O build aborta, listando os arquivos, se algum nome não terminar em `CQ/CR/EQ/ER/WQ/WR` ou se aparecer uma classe desconhecida.

## Limites conhecidos

- Quem tem a senha pode baixar tudo e repassar. Um site estático não impede isso.
- O `data.enc` é público, então dá para tentar adivinhar a senha offline. O PBKDF2 só deixa isso mais lento, por isso use uma senha longa.
- Para revogar o acesso: troque a senha, rode o build e faça o push.
- A maioria dos setups é de terceiros (HYMO). Mantenha o catálogo restrito ao grupo.
