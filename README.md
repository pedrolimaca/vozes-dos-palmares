# Vozes dos Palmares

Site do Centro Cultural Afro-brasileiro e Biblioteca Zumbi dos Palmares (Taubaté-SP).
HTML, CSS e JavaScript puros (sem build), com Supabase (login, banco de dados e fotos) e hospedagem na Vercel.

## Quem pode fazer o quê

| Quem | Pode |
|---|---|
| Visitante (sem conta) | Ver acervo, agenda, galeria, atividades; enviar mensagem de contato |
| Usuário (conta de visitante) | Tudo acima + publicar relatos na página "O Centro" |
| Editor | Tudo acima + cadastrar/excluir livros, eventos, fotos, atividades e relatos |
| **Administrador** | Tudo + ver mensagens de contato e gerenciar as permissões das pessoas (promover, bloquear) |

Só quem tem permissão de **Editor** ou **Administrador** vê o menu "Painel" e consegue gravar conteúdo. Essa regra fica no banco de dados, não só na tela.

## Conectar o Supabase (resumo)

O site só precisa de **dois valores** do seu projeto no Supabase. Eles ficam em `js/config.js`:

```js
const CONFIG = {
  SUPABASE_URL: "https://abcdefghijk.supabase.co",   // <- Project URL
  SUPABASE_ANON_KEY: "eyJhbGciOi...",                 // <- chave "anon public"
  CENTRO: { ... }                                     // <- dados do centro (endereço, e-mail...)
};
```

Onde achar: no Supabase, abra o projeto > **Project Settings > API** (ou o botão **Connect**). Copie a **Project URL** e a chave **anon public**.
A chave *anon* é pública por natureza e pode ir para o GitHub; quem protege os dados são as regras do `schema.sql`. **Nunca** coloque a chave `service_role` nem a senha do banco no site.

## Passo a passo completo

1. **Criar o projeto no Supabase**: em supabase.com, "New project". Guarde a senha do banco (ela não vai no site).
2. **Criar as tabelas e as regras**: no projeto, abra **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
   - Já rodou uma versão anterior do banco? Rode só o `supabase/migracao-completa.sql` (pode rodar mais de uma vez; não apaga dados).
3. **Conectar o site**: cole a URL e a chave no `js/config.js` (veja acima).
4. **Dados do centro**: ainda em `js/config.js`, preencha `CENTRO` (endereço, horários, e-mail, telefone, WhatsApp, link do mapa). O que ficar vazio não aparece no site.
5. **Testar no computador**: na pasta do projeto, `npx serve .` e abra o endereço mostrado. Enquanto o `config.js` estiver com os valores de exemplo, o site mostra um aviso vermelho dizendo que não está conectado.
6. **Criar a conta do administrador** (veja a próxima seção).
7. **Cadastrar o conteúdo** pelo Painel: livros (com capa), eventos da agenda, fotos (com data e descrição), atividades do centro. Em "Usuários e permissões" você promove outras pessoas a Editor (por exemplo, voluntários) ou bloqueia quem abusar.
8. **Subir para o GitHub e publicar na Vercel** (veja as seções abaixo).
9. **Voltar ao Supabase**: em **Authentication > URL Configuration**, coloque o endereço do site da Vercel em *Site URL* e, em *Redirect URLs*, adicione `https://SEU-SITE.vercel.app/**` (sem isso, os links de confirmação de e-mail e de "esqueci minha senha" não voltam para o site).

## E-mail e senha do administrador

**Não existe e-mail nem senha padrão**, de propósito: uma senha escrita no código ficaria pública no GitHub. O administrador define os próprios dados:

**Opção A, pelo site**
1. Abra `login.html`, aba "Criar conta de visitante" e cadastre o e-mail e a senha que quiser (confirme o e-mail, se o Supabase pedir).
2. No Supabase, em **SQL Editor**, rode (trocando pelo e-mail cadastrado):
   ```sql
   update public.profiles set role = 'admin' where email = 'EMAIL-DO-ADMIN';
   ```

**Opção B, pelo painel do Supabase** (sem precisar confirmar e-mail)
1. Em **Authentication > Users > Add user > Create new user**, informe e-mail e senha e marque *Auto Confirm User*.
2. Rode o mesmo `update` acima no SQL Editor.

Depois, saia e entre de novo em `login.html`: aparece o menu **Painel**.

### Trocar o e-mail ou a senha depois

- **Minha conta** (menu, quando logado): altera a **senha** na hora e o **e-mail** de acesso (o Supabase manda um link de confirmação para o novo e-mail; só muda depois de clicar).
- **Esqueci minha senha** (tela de entrada): digite o e-mail e clique no link; chega um e-mail com um link que abre a página "Minha conta" para definir a nova senha. Isso exige o passo 9 acima (Redirect URLs).
- O e-mail exibido na lista de usuários do Painel acompanha automaticamente a troca de e-mail.
- Para exigir senhas mais fortes, ajuste em **Authentication** (política de senha) no Supabase.

## Receber as mensagens de contato por e-mail

Toda mensagem do formulário fica salva no banco e aparece no Painel (só o administrador vê). Para **também** chegar por e-mail:

1. Crie uma conta em resend.com e gere uma chave de API.
2. Na Vercel, em **Settings > Environment Variables**, crie `RESEND_API_KEY` (a chave) e `CONTATO_DESTINO` (o e-mail que recebe as mensagens).
3. Sem domínio verificado no Resend, o remetente padrão só entrega para o e-mail da própria conta Resend. Dica: crie a conta Resend usando o e-mail que vai receber. Para outro destino, verifique um domínio e defina `CONTATO_REMETENTE` (ex.: `Vozes dos Palmares <contato@seudominio.com>`).

## Subir para o GitHub

1. Em github.com/new, crie um repositório **vazio** (sem README, sem .gitignore), por exemplo `vozes-dos-palmares`.
2. Na pasta do projeto, no terminal:
   ```bash
   git init -b main
   git add .
   git commit -m "Site Vozes dos Palmares"
   git remote add origin https://github.com/SEU-USUARIO/vozes-dos-palmares.git
   git push -u origin main
   ```
3. O GitHub não aceita mais a senha da conta no terminal: use um *Personal Access Token* (GitHub > Settings > Developer settings > Tokens) como senha, ou entre com `gh auth login` (GitHub CLI).
4. Sem terminal: no repositório vazio, clique em **uploading an existing file** e arraste os arquivos da pasta.

O `.gitignore` já impede subir `node_modules`, `.env` e arquivos temporários. Depois do primeiro envio, cada alteração é `git add .`, `git commit -m "o que mudou"` e `git push`.

## Publicar na Vercel

Na Vercel, **Add New > Project**, escolha o repositório do GitHub, Framework **Other**, sem comando de build. A cada `git push`, o site é atualizado sozinho.

## Deixar só o administrador entrar (sem cadastro de visitantes)

Se preferir que ninguém além da equipe tenha conta: no Supabase, em **Authentication** (menu *Sign In / Providers* ou *Settings*, o nome varia), desligue a opção de permitir novos cadastros. Atenção: sem contas de visitantes, ninguém consegue publicar relatos.

## Arquivos principais

- `index.html`, `acervo.html`, `agenda.html`, `galeria.html`, `centro.html`, `projeto.html`, `contato.html`: páginas públicas.
- `login.html`, `conta.html` e `admin.html`: entrada, troca de e-mail/senha e painel.
- `js/config.js`: conexão com o Supabase e dados do centro. `js/app.js`: código compartilhado.
- `supabase/schema.sql` (instalação nova) e `supabase/migracao-completa.sql` (atualizar banco existente).
- `api/contato.js`: função da Vercel que envia o e-mail do contato.
- `img/hero.webp`: retrato da página inicial (PNG/WebP com fundo transparente; pode ser trocado).
