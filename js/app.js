// Enquanto js/config.js tiver os valores de exemplo, o site avisa que ainda não está conectado.
const RECUPERANDO = /type=recovery/.test(location.hash); // chegou pelo link de "esqueci minha senha"
const PENDENTE = /SEU-PROJETO|SUA-CHAVE/.test(CONFIG.SUPABASE_URL + CONFIG.SUPABASE_ANON_KEY);
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = d => new Date(d).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
const TEMAS = ["Romance", "Memória", "Ensaio", "Poesia", "Infantil", "Outro"];

async function getUser() { const { data } = await sb.auth.getSession(); return data.session?.user || null; }
// user | editor | admin (ou null, se não estiver logado)
async function getRole(u) {
  if (!u) return null;
  const { data } = await sb.from("profiles").select("role,bloqueado").eq("id", u.id).maybeSingle();
  return data?.bloqueado ? "user" : (data?.role || "user"); // conta bloqueada perde o acesso ao painel
}

async function layout(active) {
  const user = await getUser(), role = await getRole(user), admin = role === "admin", staff = admin || role === "editor";
  const links = [["acervo.html","Acervo"],["agenda.html","Agenda"],["galeria.html","Galeria"],["centro.html","O Centro"],["projeto.html","O projeto"],["contato.html","Contato"]];
  const cur = h => h === active ? 'aria-current="page"' : "";
  $("#top").innerHTML = `<header><div class="wrap"><nav aria-label="Principal"><a class="brand" href="index.html">Vozes dos Palmares</a><button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button><ul id="menu">` +
    links.map(([h, t]) => `<li><a href="${h}" ${cur(h)}>${t}</a></li>`).join("") +
    (staff ? `<li><a href="admin.html" ${cur("admin.html")}>Painel</a></li>` : "") +
    (user ? `<li><a href="conta.html" ${cur("conta.html")}>Minha conta</a></li><li><button class="link" id="sair">Sair</button></li>` : `<li><a href="login.html" ${cur("login.html")}>Entrar</a></li>`) +
    `</ul></nav></div></header>`;
  $("#foot").innerHTML = `<footer><div class="wrap">Vozes dos Palmares · Extensão Universitária UniSENAI 2026 · Faculdade SENAI Félix Guisard, Taubaté-SP. Em parceria com o Centro Cultural Afro-brasileiro e Biblioteca Zumbi dos Palmares.</div></footer>`;
  if (PENDENTE) $("main").insertAdjacentHTML("afterbegin", '<div class="wrap" style="padding-top:6rem"><p class="msg err">O site ainda não está conectado ao Supabase. Preencha o arquivo js/config.js (veja o README).</p></div>');
  const s = $("#sair"); if (s) s.onclick = async () => { await sb.auth.signOut(); location.href = "index.html"; };
  const nav = $("nav"), mb = $(".menu-btn");
  mb.onclick = () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); document.body.classList.toggle("menu-open", o); };
  if ($("main.flush")) { const f = () => { const hs = $(".hs"); document.body.classList.toggle("at-top", scrollY < (hs ? hs.offsetHeight - innerHeight + 60 : 40)); }; f(); addEventListener("scroll", f, { passive: true }); }
  return { user, role, admin, staff };
}

const TC = { Romance: "#e0a32e", Memória: "#e8552d", Ensaio: "#4fb3a5", Poesia: "#d98fb0", Infantil: "#9bc45a", Outro: "#9b9386" };
const bookCard = b => `<li class="card"><div><strong><a href="acervo.html?livro=${encodeURIComponent(b.id)}" style="text-decoration:none">${esc(b.titulo)}</a></strong>${b.descricao ? `<p>${esc(b.descricao)}</p>` : ""}</div><span>${esc(b.autor)}</span><em style="color:${TC[b.tema] || TC.Outro}">${esc(b.tema)}</em></li>`;
const eventCard = e => { const d = new Date(e.data_hora);
  return `<div class="ev${d < Date.now() - 36e5 ? " past" : ""}"><div><b>${String(d.getDate()).padStart(2,"0")}</b><small>${d.toLocaleDateString("pt-BR",{month:"short",weekday:"short"})} · ${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small></div><p><strong>${esc(e.titulo)}</strong>${e.local ? `<br><small>${esc(e.local)}</small>` : ""}${e.descricao ? `<br>${esc(e.descricao)}` : ""}</p></div>`; };

async function show(el, query, render, empty) {
  const { data, error } = await query;
  if (error) { el.innerHTML = `<p class="msg err">Não foi possível carregar os dados. Verifique js/config.js e se o schema.sql foi executado. (${esc(error.message)})</p>`; return []; }
  el.innerHTML = data.length ? data.map(render).join("") : `<p class="msg">${empty}</p>`;
  return data;
}
const upcoming = () => sb.from("eventos").select("*").gte("data_hora", new Date(Date.now() - 36e5).toISOString()).order("data_hora");

// Coverflow 3D: porte para JS puro do componente Smooth3DSlideshow (Originkit).
// Clique numa foto para trazê-la ao centro; setas do teclado, botões e arrastar também funcionam.
function coverflow(el, slides) {
  if (!slides.length) { el.innerHTML = '<p class="msg">Nenhuma foto cadastrada ainda.</p>'; return; }
  const n = slides.length; let a = 0, lock = false, w = 400;
  el.classList.add("cf"); el.tabIndex = 0; el.setAttribute("role", "group"); el.setAttribute("aria-roledescription", "carrossel");
  el.innerHTML = `<div class="cf-stage"></div><p class="cf-cap" aria-live="polite"></p><div class="cf-ctl"><button type="button" data-d="-1" aria-label="Foto anterior">←</button><button type="button" data-d="1" aria-label="Próxima foto">→</button></div>`;
  const stage = $(".cf-stage", el), cap = $(".cf-cap", el);
  const cards = slides.map((s, i) => { const d = document.createElement("div"); d.className = "cf-card";
    d.innerHTML = `<img src="${esc(s.url)}" alt="${esc(s.legenda || "Foto do Centro Cultural")}" draggable="false"><i></i>`;
    d.onclick = () => go(i === a ? a + 1 : i); stage.appendChild(d); return d; });
  const size = () => { w = Math.min(400, el.clientWidth * .62); stage.style.width = stage.style.height = w + "px"; };
  function draw() {
    cards.forEach((c, i) => { let r = i - a; if (r > n / 2) r -= n; if (r < -n / 2) r += n;
      const x = Math.abs(r), vis = x <= 2;
      c.style.transform = `translate(-50%,-50%) translateX(${r * 240 * w / 400}px) translateZ(${-x * 240}px) rotateY(${-r * 12}deg) rotateZ(${r * 8}deg) scale(${Math.max(.4, 1 - x * .16)})`;
      c.style.opacity = vis ? 1 : 0; c.style.pointerEvents = vis ? "auto" : "none"; c.setAttribute("aria-hidden", !vis);
      c.lastChild.style.opacity = r ? .4 : 0; });
    cap.textContent = slides[a].legenda || "";
  }
  function go(i) { if (lock) return; lock = true; setTimeout(() => lock = false, 600); a = ((i % n) + n) % n; draw(); }
  el.addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (b) go(a + +b.dataset.d); });
  el.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); go(a + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(a - 1); } });
  let x0 = null; el.addEventListener("pointerdown", e => x0 = e.clientX);
  el.addEventListener("pointerup", e => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(a + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  addEventListener("resize", () => { size(); draw(); });
  size(); draw();
}

// Hero em rolagem: a imagem (PNG/WebP com fundo transparente) fica sobre o degradê do hero e cresce
// de uma máscara em arco até a tela cheia. No começo, ela é reduzida e deslocada para o rosto
// ficar no centro do arco.
function scrollHero() {
  const hs = $(".hs"), fig = $(".hs-fig"), img = $(".hs-fig img"), txt = $(".hs-txt"), cue = $(".hs-cue");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FX = 0.273, TOP = 0.013, HW = 0.268, HH = .65; // rosto: centro x, topo da cabeça, largura da cabeça, altura (frações da imagem)
  function tick() {
    const W = innerWidth, H = innerHeight;
    const p = still ? 1 : Math.min(1, Math.max(0, -hs.getBoundingClientRect().top / (hs.offsetHeight - H)));
    const e = 1 - Math.pow(1 - p, 3), k = 1 - e;
    // no desktop o arco fica à direita, para não ficar atrás do título
    const L = W > 700 ? .5 : .14, R = W > 700 ? .12 : .14, archW = W * (1 - L - R), cx = W * (L + (1 - L - R) / 2);
    fig.style.clipPath = `inset(${k * .16 * H}px ${k * R * W}px ${k * .16 * H}px ${k * L * W}px round ${k * archW / 2}px ${k * archW / 2}px ${k * 24}px ${k * 24}px)`;
    if (img && img.naturalWidth) {
      // A imagem tem o tamanho "cover" completo e é movida por transform (origem no canto superior esquerdo).
      // No começo ela é reduzida para mostrar o busto inteiro dentro do arco, com a base alinhada ao fundo do arco.
      const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight), rw = img.naturalWidth * cover, rh = img.naturalHeight * cover;
      const archH = .68 * H, base = .84 * H;
      const s0 = Math.min(1, .96 * archH / rh, .72 * archW / (HW * rw));
      const x0 = (W - rw) / 2 + (W > 700 ? 0 : Math.min(W / 2 - ((W - rw) / 2 + FX * rw), (rw - W) / 2)); // tela cheia (no celular, rosto visível)
      const x1 = cx - FX * rw * s0;                          // arco: busto centralizado (a borda esquerda da imagem é suavizada)
      const y1 = base - rh * s0;                             // arco: base da imagem na base do arco
      const s = 1 - k * (1 - s0);
      img.style.width = rw + "px"; img.style.height = rh + "px"; img.style.transformOrigin = "0 0";
      img.style.transform = `translate(${x0 + k * (x1 - x0)}px,${k * y1}px) scale(${s})`;
    }
    txt.style.opacity = Math.max(0, 1 - e * 1.5); txt.style.transform = `translateY(${-e * 60}px)`;
    cue.style.opacity = Math.max(0, 1 - p * 6);
  }
  if (img) img.addEventListener("load", tick);
  addEventListener("scroll", tick, { passive: true }); addEventListener("resize", tick); tick();
}

// Datas e filtro por mês (usados na agenda e na galeria)
const dia = d => new Date(String(d).length === 10 ? d + "T12:00:00" : d);
const mesChave = d => { const x = dia(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0"); };
const mesNome = k => { const [y, m] = k.split("-"), t = new Date(+y, +m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return t[0].toUpperCase() + t.slice(1); };
const mesesOpcoes = (datas, extra = "", asc = false) => { const ks = [...new Set(datas.map(mesChave))].sort(); if (!asc) ks.reverse(); return extra + ks.map(k => `<option value="${k}">${mesNome(k)}</option>`).join(""); };

// Dados de contato do centro (js/config.js) em formato de lista, com links clicáveis
async function carregarDadosCentro() {
  const { data } = await sb.from("dados_centro").select("*").eq("id", 1).maybeSingle();
  return data ?? CONFIG.CENTRO ?? {};
}

function infoCentro(C) {
  const mapa = /^https?:\/\//i.test(C.mapa || "") ? C.mapa : "";
  const dig = n => String(n || "").replace(/\D/g, ""), br = n => { n = dig(n); return n.length <= 11 ? "55" + n : n; };
  const row = (t, v) => v ? `<dt>${t}</dt><dd>${v}</dd>` : "";
  return row("Endereço", C.endereco ? esc(C.endereco) + (mapa ? ` · <a href="${esc(mapa)}" target="_blank" rel="noopener">Ver no mapa</a>` : "") : "")
    + row("Horários", esc(C.horarios))
    + row("Telefone", dig(C.telefone) ? `<a href="tel:+${br(C.telefone)}">${esc(C.telefone)}</a>` : "")
    + row("WhatsApp", dig(C.whatsapp) ? `<a href="https://wa.me/${br(C.whatsapp)}" target="_blank" rel="noopener">${esc(C.whatsapp)} · abrir conversa</a>` : "")
    + row("E-mail", C.email ? `<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>` : "");
}
