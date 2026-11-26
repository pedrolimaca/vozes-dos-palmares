// 1) Cole aqui os dados do projeto: Supabase > Project Settings > API (ou "Connect").
//    A chave "anon" é pública por natureza; a segurança vem das regras (RLS) do schema.sql.
// 2) Preencha os dados de contato do centro (aparecem em "O Centro" e "Contato").
//    Deixe vazio o que não quiser exibir.
const CONFIG = {
  SUPABASE_URL: "https://qhvjabxmvpvvxqpdyahs.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-JzxQ_Frfz1PxifyWfJkVw_1OVf-uuZ",
  CENTRO: {
    endereco: "Taubaté-SP (endereço completo a confirmar com o centro)",
    horarios: "A confirmar com o centro",
    email: "",       // ex.: "contato@centro.org.br"
    telefone: "",    // ex.: "(12) 3333-4444"
    whatsapp: "",    // ex.: "(12) 99999-0000"  -> aparece um botão para abrir a conversa
    mapa: ""         // link do Google Maps do endereço (opcional)
  }
};
