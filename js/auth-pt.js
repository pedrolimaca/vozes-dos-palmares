// Guarde os parâmetros antes de o Supabase remover o fragmento da URL.
const retornoAuth = new URLSearchParams(location.hash.slice(1));
for (const [chave, valor] of new URLSearchParams(location.search)) {
  if (!retornoAuth.has(chave)) retornoAuth.set(chave, valor);
}

function mensagemAuth(erro, padrao) {
  const mensagens = {
    email_not_confirmed: "Confirme seu e-mail antes de entrar.",
    invalid_credentials: "E-mail ou senha incorretos.",
    over_email_send_rate_limit: "O limite de envio de e-mails foi atingido. Aguarde e tente novamente.",
    over_request_rate_limit: "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
    email_address_not_authorized: "O serviço de e-mail ainda não está habilitado para esse endereço. Fale com a equipe do site.",
    email_address_invalid: "Confira se o endereço de e-mail está correto.",
    user_already_exists: "Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.",
    email_exists: "Este e-mail já está em uso.",
    weak_password: "Escolha uma senha mais forte.",
    same_password: "Escolha uma senha diferente da atual.",
    signup_disabled: "O cadastro de novas contas está temporariamente desativado.",
    user_banned: "Esta conta está bloqueada. Fale com a equipe do site.",
    otp_expired: "Este link expirou ou já foi usado. Solicite um novo link na página Entrar.",
    session_not_found: "Sua sessão expirou. Entre novamente."
  };
  return Object.hasOwn(mensagens, erro?.code) ? mensagens[erro.code] : padrao;
}

function erroRetornoAuth() {
  return retornoAuth.has("error") || retornoAuth.has("error_code");
}

function limparRetornoAuth() {
  history.replaceState(null, "", location.pathname);
}
