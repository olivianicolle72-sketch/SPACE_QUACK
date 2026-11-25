(function () {
  "use strict";

  // CONFIGURAÇÃO FIXA DO SEU BANCO SUPABASE
  const SUPABASE_URL = "https://dlprrgaslanlxpibiuof.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2xJp9pOMCrmoopTJUVzgVA_faUcL8Uz";
  const PAGINA_JOGO = "http://127.0.0.1:5500/game/pato.html";

  const btnAtualizar = document.getElementById("btnAtualizarLista");
  const statusConexao = document.getElementById("statusConexao");
  const lista = document.getElementById("listaJogadoresSupabase");
  const listaVazia = document.getElementById("listaVaziaSupabase");
  const contador = document.getElementById("contadorSupabase");
  const listaAutomatica = document.getElementById("listaAutomaticaCadastros");
  const listaAutomaticaVazia = document.getElementById("listaAutomaticaVazia");

  let cliente = null;
  let jogadores = [];
  let canalRealtime = null;

  function mostrarStatus(texto) {
    if (statusConexao) {
      statusConexao.textContent = texto;
    }
  }

  function celula(texto) {
    const td = document.createElement("td");
    td.textContent = String(texto !== null && texto !== undefined ? texto : "");
    return td;
  }

  function botao(texto, classe, acao, rotulo) {
    const elemento = document.createElement("button");
    elemento.type = "button";
    elemento.className = classe;
    elemento.textContent = texto;
    elemento.setAttribute("aria-label", rotulo);
    elemento.addEventListener("click", acao);
    return elemento;
  }

  function adicionarNaListaAutomatica(jogador, origem) {
    if (!listaAutomatica || !jogador) return;

    if (listaAutomaticaVazia) {
      listaAutomaticaVazia.hidden = true;
    }

    const item = document.createElement("li");
    item.className = "item-automatico";

    const titulo = document.createElement("strong");
    titulo.textContent = `${jogador.nickname || "Sem nick"} (${jogador.nome || "Sem nome"})`;

    const detalhes = document.createElement("span");
    detalhes.textContent = `${origem} • Idade: ${jogador.idade ?? "-"} • Score: ${jogador.score ?? 0}`;

    item.append(titulo, detalhes);
    listaAutomatica.prepend(item);
  }

  function sincronizarListaAutomaticaCompleta() {
    if (!listaAutomatica) return;
    listaAutomatica.replaceChildren();

    if (!jogadores.length) {
      if (listaAutomaticaVazia) listaAutomaticaVazia.hidden = false;
      return;
    }

    if (listaAutomaticaVazia) listaAutomaticaVazia.hidden = true;

    jogadores.forEach(function (jogador) {
      const item = document.createElement("li");
      item.className = "item-automatico";

      const titulo = document.createElement("strong");
      titulo.textContent = `${jogador.nickname} — ${jogador.nome}`;

      const detalhes = document.createElement("span");
      detalhes.textContent = `Idade: ${jogador.idade} anos • Score: ${jogador.score ?? 0}`;

      item.append(titulo, detalhes);
      listaAutomatica.appendChild(item);
    });
  }

  async function carregarJogadores() {
    if (!cliente) {
      mostrarStatus("Cliente Supabase não inicializado.");
      return;
    }

    mostrarStatus("Consultando astronautas no lago...");
    const resposta = await cliente
      .from("astronauta")
      .select("id_astro, nome, nickname, idade, genero, score")
      .order("id_astro", { ascending: false });

    if (resposta.error) {
      console.error("Erro ao consultar astronautas:", resposta.error);
      mostrarStatus("Erro ao buscar dados. Confira a tabela e as políticas RLS.");
      return;
    }

    jogadores = resposta.data || [];
    renderizar();
    sincronizarListaAutomaticaCompleta();
    mostrarStatus(`Conectado ao lago • ${jogadores.length} astronauta(s) carregado(s).`);
  }

  function renderizar() {
    lista.replaceChildren();
    contador.textContent = jogadores.length + (jogadores.length === 1 ? " astronauta" : " astronautas");
    listaVazia.hidden = jogadores.length > 0;
    listaVazia.textContent = jogadores.length ? "" : "Nenhum astronauta encontrado na tabela.";

    jogadores.forEach(function (jogador) {
      const linha = document.createElement("tr");
      linha.appendChild(celula(jogador.id_astro));
      linha.appendChild(celula(jogador.nome));
      linha.appendChild(celula(jogador.nickname));
      linha.appendChild(celula(jogador.idade));
      linha.appendChild(celula(jogador.score));

      const tdAcoes = document.createElement("td");
      const acoes = document.createElement("div");
      acoes.className = "acoes-registro";

      acoes.appendChild(
        botao("Jogar", "botao-pequeno", function () {
          const dadosJogador = JSON.stringify(jogador);
          localStorage.setItem("jogadorAtual", dadosJogador);
          localStorage.setItem("astronauta", dadosJogador);
          window.location.href = PAGINA_JOGO;
        }, "Jogar com " + jogador.nickname)
      );

      acoes.appendChild(
        botao("Excluir", "botao-pequeno botao-perigo", function () {
          excluirJogador(jogador);
        }, "Excluir " + jogador.nickname)
      );

      tdAcoes.appendChild(acoes);
      linha.appendChild(tdAcoes);
      lista.appendChild(linha);
    });
  }

  async function excluirJogador(jogador) {
    if (!window.confirm(`Deseja excluir "${jogador.nickname}" do banco de dados?`)) return;

    const resposta = await cliente
      .from("astronauta")
      .delete()
      .eq("id_astro", jogador.id_astro);

    if (resposta.error) {
      console.error("Erro ao excluir:", resposta.error);
      alert("Não foi possível excluir o astronauta.");
      return;
    }

    await carregarJogadores();
  }

  function ativarEscutaAutomatica() {
    if (!cliente || typeof cliente.channel !== "function") return;

    if (canalRealtime) {
      cliente.removeChannel(canalRealtime);
    }

    canalRealtime = cliente
      .channel("astronautas-automaticos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "astronauta" },
        async function (payload) {
          adicionarNaListaAutomatica(payload.new, "Novo cadastro");
          await carregarJogadores();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "astronauta" },
        async function (payload) {
          adicionarNaListaAutomatica(payload.new, "Atualizado");
          await carregarJogadores();
        }
      )
      .subscribe();
  }

  async function iniciarAutomatico() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      mostrarStatus("Biblioteca do Supabase não carregou.");
      return;
    }

    if (!SUPABASE_URL || SUPABASE_URL.includes("https://dlprrgaslanlxpibiuof.supabase.co") || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("sb_publishable_2xJp9pOMCrmoopTJUVzgVA_faUcL8Uz")) {
      mostrarStatus("Preencha SUPABASE_URL e SUPABASE_ANON_KEY no arquivo JS.");
      return;
    }

    cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    ativarEscutaAutomatica();
    await carregarJogadores();
  }

  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", carregarJogadores);
  }

  iniciarAutomatico();
})();