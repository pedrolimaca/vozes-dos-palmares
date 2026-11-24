// Função da Vercel: recebe o formulário de contato e envia por e-mail via Resend.
// Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   RESEND_API_KEY      chave da conta em resend.com
//   CONTATO_DESTINO     e-mail que vai receber as mensagens
//   CONTATO_REMETENTE   opcional, ex.: "Vozes dos Palmares <contato@seudominio.com>"
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  const { nome = "", email = "", mensagem = "" } = req.body || {};
  if (!nome || nome.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 200 || !mensagem || mensagem.length > 3000)
    return res.status(400).json({ erro: "Dados inválidos" });
  const key = process.env.RESEND_API_KEY, to = process.env.CONTATO_DESTINO;
  if (!key || !to) return res.status(501).json({ erro: "E-mail não configurado" });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTATO_REMETENTE || "Vozes dos Palmares <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: "Contato pelo site: " + nome.replace(/[\r\n]+/g, " "),
      html: `<p><strong>${esc(nome)}</strong> (${esc(email)}) escreveu:</p><p>${esc(mensagem).replace(/\n/g, "<br>")}</p>`
    })
  });
  return r.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ erro: "Falha ao enviar" });
};
