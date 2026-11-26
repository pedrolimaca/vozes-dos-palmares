# E-mails de autenticação em português do Brasil

Em **Authentication → URL Configuration**, defina **Site URL** como `https://vozes-dos-palmares.vercel.app` e adicione `https://vozes-dos-palmares.vercel.app/confirmar-email` e `https://vozes-dos-palmares.vercel.app/conta` em **Redirect URLs**. Use o domínio de produção se ele for diferente.

Em **Authentication → Email Templates**, altere o assunto e o corpo dos modelos abaixo. Mantenha `{{ .ConfirmationURL }}` para o Supabase montar o link.

## Confirm signup

Assunto: **Confirme seu e-mail no Vozes dos Palmares**

```html
<h2>Confirme seu e-mail</h2>
<p>Para concluir seu cadastro no Vozes dos Palmares, confirme seu endereço de e-mail.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar meu e-mail</a></p>
<p>Se você não solicitou este cadastro, pode ignorar esta mensagem.</p>
```

## Reset password

Assunto: **Redefina sua senha no Vozes dos Palmares**

```html
<h2>Redefina sua senha</h2>
<p>Use o link abaixo para escolher uma nova senha para sua conta.</p>
<p><a href="{{ .ConfirmationURL }}">Escolher nova senha</a></p>
<p>Se você não solicitou a troca, pode ignorar esta mensagem.</p>
```

## Change email address

Assunto: **Confirme a alteração de e-mail no Vozes dos Palmares**

```html
<h2>Confirme a alteração de e-mail</h2>
<p>Use o link abaixo para confirmar a alteração do e-mail da sua conta.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar alteração de e-mail</a></p>
<p>Se você não solicitou a alteração, ignore esta mensagem e fale com a equipe do site.</p>
```
