# Como colocar o Doce Gestão no ar (Hostinger)

Guia passo a passo, sem pressupor conhecimento técnico.
**Tempo estimado na primeira vez:** 20 a 30 minutos.

---

## Como as peças se encaixam

O sistema tem duas metades, e só uma delas vai para a Hostinger:

| Peça | Onde mora | O que faz |
|---|---|---|
| **Aparência e telas** (o "front") | **Hostinger** | O que abre no navegador: botões, tabelas, gráficos. |
| **Banco de dados e login** | **Supabase** (já está no ar) | Guarda seus dados e verifica quem pode entrar. |

Ou seja: a Hostinger só serve arquivos. Quem guarda os dados continua sendo o Supabase,
que **já está funcionando** — não precisa mexer nele para o site subir.

---

## Passo 1 — Gerar os arquivos do site

Na pasta do projeto, rode:

```bash
npm run build
```

Isso cria a pasta **`dist/`**. É só o conteúdo dela que vai para a Hostinger.

> **Importante:** rode sempre com o arquivo `.env` presente na pasta. As chaves do
> Supabase são "coladas" dentro dos arquivos nesse momento. Se o `.env` sumir, o site
> sobe mas abre em branco, porque não sabe com qual banco conversar.

Dentro de `dist/` você vai ver:
- `index.html` — a página principal
- `assets/` — o código e as fontes
- `favicon.svg` — o ícone da abinha do navegador
- `.htaccess` — **arquivo oculto e obrigatório** (explicado no passo 3)

---

## Passo 2 — Enviar para a Hostinger

1. Entre no **hPanel** da Hostinger.
2. Vá em **Arquivos → Gerenciador de Arquivos**.
3. Abra a pasta **`public_html`**.
4. Se houver arquivos de teste da Hostinger lá (`default.php`, `index.html` de exemplo),
   **apague-os** — senão eles aparecem no lugar do sistema.
5. No seu computador, entre na pasta `dist/`, selecione **tudo o que está dentro dela**
   e crie um arquivo `.zip`.
   ⚠️ Compacte **o conteúdo** da pasta, não a pasta `dist` inteira. Se você subir a pasta,
   o site vai ficar em `seudominio.com/dist` em vez da raiz.
6. No Gerenciador de Arquivos, clique em **Upload** e envie o `.zip`.
7. Clique com o botão direito no `.zip` → **Extract / Extrair**.
8. Apague o `.zip` depois de extrair.

---

## Passo 3 — Conferir o arquivo `.htaccess`

Esse arquivo é o que faz os endereços internos funcionarem.

**Por que ele importa:** o Doce Gestão é uma página só. Quando você clica em "Pedidos",
o endereço vira `seudominio.com/pedidos`, mas **não existe uma pasta chamada `pedidos`**
no servidor. Sem o `.htaccess`, navegar funciona, mas **apertar F5 em qualquer tela
mostraria "404 — página não encontrada"**. Ele manda o servidor entregar sempre o
`index.html`, e o sistema resolve o resto.

Como conferir:
1. No Gerenciador de Arquivos, clique nos três pontinhos (ou em **Configurações**) e
   marque **"Mostrar arquivos ocultos"** — arquivos que começam com ponto ficam
   escondidos por padrão.
2. Confirme que o `.htaccess` está dentro de `public_html`.
3. Se não estiver, ele se perdeu na compactação: crie um arquivo novo com esse nome
   e cole o conteúdo de `public/.htaccess` do projeto.

---

## Passo 4 — Avisar o Supabase qual é o novo endereço

Sem esse passo, o link de **"esqueci minha senha"** vai levar a pessoa para
`localhost` — um endereço que só existe no seu computador.

1. Abra o painel do **Supabase** → seu projeto.
2. Vá em **Authentication → URL Configuration**.
3. Em **Site URL**, coloque o endereço do site: `https://seudominio.com`
4. Em **Redirect URLs**, adicione:
   - `https://seudominio.com/**`
   - `http://localhost:5173/**` (para continuar testando no seu computador)
5. Salve.

---

## Passo 5 — Testar o que está no ar

Abra `https://seudominio.com` e confira, nesta ordem:

1. **Abre a tela de login** com o cadeado (HTTPS) na barra de endereço.
2. **Entrar** com seu e-mail e senha funciona.
3. **Aperte F5 dentro do sistema** (em Pedidos, por exemplo). Se aparecer 404,
   o `.htaccess` não está no lugar — volte ao passo 3.
4. Os seus **dados aparecem** (receitas, pedidos, clientes).
5. Crie um pedido de teste, dê baixa e confira se o estoque baixou.
6. **Sair** e tentar abrir `https://seudominio.com/painel` direto: tem que mandar
   para o login.

---

## Atualizar o sistema depois

Toda vez que houver mudanças:

```bash
npm run build
```

Depois suba o conteúdo de `dist/` de novo, **substituindo** os arquivos antigos.
A pasta `assets/` acumula arquivos velhos com o tempo — dá para apagá-la antes de
subir a nova, sem medo.

---

## Perguntas que costumam surgir

**A chave do Supabase fica visível dentro do site. Isso é perigoso?**
Não. Ela é a chave *pública* (`anon` / `publishable`) e foi feita para ficar exposta —
todo site que usa Supabase mostra a dele. Quem protege os dados é o **RLS**: cada
tabela tem uma regra dizendo "só devolve as linhas de quem está logado". Isso foi
testado: sem login, o banco devolve lista vazia e recusa qualquer gravação.
A chave perigosa é a `service_role`, que **não está** em lugar nenhum do site.

**O site abriu em branco, o que houve?**
Quase sempre é o build feito sem o arquivo `.env`. Rode `npm run build` de novo com
ele na pasta e suba tudo outra vez.

**Preciso de um plano caro da Hostinger?**
Não. O sistema é feito de arquivos estáticos — qualquer plano de hospedagem
compartilhada com domínio e HTTPS dá conta. Não precisa de Node.js, PHP nem banco
de dados na Hostinger.

**Posso automatizar o envio?**
Dá, com um fluxo do GitHub que envia por FTP a cada mudança. Exige guardar usuário e
senha de FTP no GitHub. Vale a pena quando as atualizações ficarem frequentes; no
começo, subir o zip à mão é mais simples e mais fácil de entender.
