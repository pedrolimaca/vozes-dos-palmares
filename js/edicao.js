// Gerencia os itens na própria página, usando as permissões do Supabase.
function gestaoLocal(alvo, tabela, nome, campos, itens, atualizar) {
  const area = document.createElement("section");
  area.className = "gestao-local";
  alvo.before(area);
  area.innerHTML = '<button class="btn" type="button">Adicionar ' + nome + '</button><dialog class="bk-dlg editor-pagina"><form class="box"><h2></h2><div></div><p class="msg err" role="alert" hidden></p><p class="editor-acoes"><button class="btn">Salvar</button><button class="btn alt" type="button">Cancelar</button><button class="btn danger" type="button">Excluir</button></p></form></dialog>';
  const dialogo = area.querySelector("dialog");
  const form = dialogo.querySelector("form");
  const titulo = form.querySelector("h2");
  titulo.id = "titulo-" + tabela;
  dialogo.setAttribute("aria-labelledby", titulo.id);
  const aviso = form.querySelector("[role=alert]");
  const [salvar, cancelar, excluir] = form.querySelectorAll("button");
  const inputs = campos.map(([chave, rotulo, tipo, atributos]) => {
    const label = document.createElement("label");
    label.textContent = rotulo;
    const input = document.createElement(tipo === "textarea" ? "textarea" : "input");
    if (tipo !== "textarea") input.type = tipo;
    Object.assign(input, {name: chave}, atributos);
    label.append(input);
    form.querySelector("div").append(label);
    return input;
  });
  let item;
  function abrir(registro) {
    item = registro;
    aviso.hidden = true;
    form.reset();
    titulo.textContent = (item ? "Editar " : "Adicionar ") + nome;
    excluir.hidden = !item;
    for (const input of inputs) {
      if (input.type === "file") {
        input.required = !item;
        continue;
      }
      const valor = item?.[input.name];
      if (valor && input.type === "datetime-local") {
        const data = new Date(valor);
        data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
        input.value = data.toISOString().slice(0, 16);
      } else input.value = valor ?? (input.type === "number" ? 10 : "");
      input.dataset.original = input.value;
    }
    dialogo.showModal();
    inputs[0].focus();
  }
  async function gravar(apagar) {
    if (salvar.disabled) return;
    salvar.disabled = cancelar.disabled = excluir.disabled = true;
    aviso.hidden = true;
    let novoArquivo;
    try {
      const dados = {};
      if (!apagar) for (const input of inputs) {
        const valor = input.value.trim();
        if (input.type === "file") {
          const arquivo = input.files[0];
          if (!arquivo) continue;
          if (arquivo.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter até 5 MB.");
          const path = crypto.randomUUID() + "-" + arquivo.name.replace(/[^\w.-]/g, "_");
          const bucket = sb.storage.from("fotos");
          const envio = await bucket.upload(path, arquivo);
          if (envio.error) throw envio.error;
          novoArquivo = dados.path = path;
          dados.url = bucket.getPublicUrl(path).data.publicUrl;
          continue;
        }
        if (input.required && !valor) throw new Error("Preencha os campos obrigatórios.");
        if (item && input.type === "datetime-local" && valor === input.dataset.original) continue;
        dados[input.name] = !valor ? null : input.type === "number" ? Number(valor)
          : input.type === "datetime-local" ? new Date(valor).toISOString() : valor;
      }
      const api = sb.from(tabela);
      const pedido = apagar ? api.delete().eq("id", item.id)
        : item ? api.update(dados).eq("id", item.id) : api.insert(dados);
      const {data, error} = await pedido.select().maybeSingle();
      if (error || !data) {
        if (novoArquivo && (!error || /^\w{5}$/.test(error.code))) {
          await sb.storage.from("fotos").remove([novoArquivo]);
        }
        throw error || new Error("Confira sua permissão ou se o item ainda existe.");
      }
      const antigo = item?.path;
      if (antigo && (apagar || novoArquivo)) {
        const emUso = await sb.from(tabela).select("id").eq("path", antigo).limit(1);
        if (!emUso.error && !emUso.data.length) await sb.storage.from("fotos").remove([antigo]);
      }
      dialogo.close();
      const indice = itens.findIndex(registro => registro.id === data.id);
      if (indice >= 0) itens.splice(indice, 1);
      if (!apagar) itens.push(data);
      atualizar(data, apagar);
    } catch (erro) {
      aviso.textContent = "Não foi possível salvar: " + erro.message;
      aviso.hidden = false;
    } finally {
      salvar.disabled = cancelar.disabled = excluir.disabled = false;
    }
  }
  area.querySelector("button").onclick = () => abrir(null);
  form.onsubmit = evento => { evento.preventDefault(); gravar(false); };
  cancelar.onclick = () => dialogo.close();
  excluir.onclick = () => { if (confirm("Excluir " + nome + "?")) gravar(true); };
  dialogo.addEventListener("cancel", evento => { if (salvar.disabled) evento.preventDefault(); });
  return id => {
    const registro = itens.find(x => x.id === id);
    if (registro) abrir(registro);
  };
}
