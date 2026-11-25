const CONFIG = {
  totalSlots: 4,
  chaveSlotsLocalStorage: "astronautasSlots",
  chaveLocalStorage: "astronauta",
  chaveJogadorAtual: "jogadorAtual",
  paginaJogo: "http://127.0.0.1:5500/game/pato.html",
  paginaDados: "http://127.0.0.1:5500/superbase/superbase.html"
};

const formulario = document.getElementById("from");
const tituloForm = document.getElementById("tituloForm");
const painelSlots = document.getElementById("painelSlots");
const campoId = document.getElementById("idJogador");
const campoNome = document.getElementById("nome");
const campoNickname = document.getElementById("user");
const campoIdade = document.getElementById("idade");
const listaJogadores = document.getElementById("listaJogadores");
const contador = document.getElementById("contador");
const btnSalvar = document.getElementById("ENVIAR");
const btnCancelarEdicao = document.getElementById("CANCELAR_EDICAO");
const linkDados = document.querySelector(".btn-dados");

// Array fixo de 4 slots (null = slot vazio)
let slots = Array(CONFIG.totalSlots).fill(null);
let slotAlvoCadastro = 0;
let editandoIndex = null;
let clienteSupabase = null;

if (
  !formulario ||
  !painelSlots ||
  !campoId ||
  !campoNome ||
  !campoNickname ||
  !campoIdade ||
  !listaJogadores ||
  !contador ||
  !btnSalvar
) {
  console.error("Erro: confira os IDs dos elementos no HTML.");
} else {
  if (linkDados && CONFIG.paginaDados) {
    linkDados.href = CONFIG.paginaDados;
  }
  inicializarSupabase();
  inicializar();
}

function inicializarSupabase() {
  const cfg = window.SUPABASE_CONFIG || {};
  if (window.supabase && cfg.url && cfg.anonKey) {
    clienteSupabase = window.supabase.createClient(cfg.url, cfg.anonKey);
  }
}

async function inicializar() {
  await carregarSlots();

  const temAlgumAstronauta = slots.some((item) => item !== null);
  if (temAlgumAstronauta) {
    mostrarSlots();
  } else {
    abrirCadastroNoSlot(0);
  }

  formulario.addEventListener("submit", salvarAstronauta);
  if (btnCancelarEdicao) {
    btnCancelarEdicao.addEventListener("click", () => {
      limparFormulario();
      mostrarSlots();
    });
  }
}

function obterIconeGenero(genero) {
  if (genero === "Feminino") return "♀";
  if (genero === "Masculino") return "♂";
  if (genero === "Neutro") return "⚧";
  return "";
}

function getGenero() {
  const selecionado = document.querySelector('input[name="genero"]:checked');
  return selecionado ? selecionado.value : "";
}

function setGenero(valor) {
  const radios = document.querySelectorAll('input[name="genero"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === valor;
  });
}

function salvarSlotsLocal() {
  localStorage.setItem(CONFIG.chaveSlotsLocalStorage, JSON.stringify(slots));
}

function definirJogadorAtual(astronauta) {
  if (!astronauta) return;
  const json = JSON.stringify(astronauta);
  localStorage.setItem(CONFIG.chaveLocalStorage, json);
  localStorage.setItem(CONFIG.chaveJogadorAtual, json);
}

async function carregarSlots() {
  slots = Array(CONFIG.totalSlots).fill(null);

  if (clienteSupabase) {
    const resposta = await clienteSupabase
      .from("astronauta")
      .select("id_astro, nome, nickname, idade, genero, score")
      .order("id_astro", { ascending: true })
      .limit(CONFIG.totalSlots);

    if (!resposta.error && Array.isArray(resposta.data)) {
      resposta.data.forEach((registro, i) => {
        if (i < CONFIG.totalSlots) {
          slots[i] = registro;
        }
      });
      salvarSlotsLocal();
      return;
    }
  }

  const salvo = localStorage.getItem(CONFIG.chaveSlotsLocalStorage);
  if (salvo) {
    try {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed)) {
        for (let i = 0; i < CONFIG.totalSlots; i++) {
          slots[i] = parsed[i] || null;
        }
      }
    } catch (erro) {
      console.error("Erro ao ler slots do localStorage:", erro);
    }
  }
}

function mostrarFormulario() {
  painelSlots.hidden = true;
  formulario.hidden = false;
  campoNome.focus();
}

function mostrarSlots() {
  formulario.hidden = true;
  painelSlots.hidden = false;
  renderizarSlots();
}

function abrirCadastroNoSlot(indexSlot) {
  editandoIndex = null;
  slotAlvoCadastro = indexSlot;
  limparFormulario();
  if (tituloForm) {
    tituloForm.textContent = `REGISTRO DO ASTRONAUTA — SLOT ${indexSlot + 1}`;
  }
  btnSalvar.textContent = "ENVIAR";
  if (btnCancelarEdicao) {
    btnCancelarEdicao.hidden = !slots.some((item) => item !== null);
  }
  mostrarFormulario();
}

function abrirEdicaoDoSlot(indexSlot) {
  const jogador = slots[indexSlot];
  if (!jogador) return;

  editandoIndex = indexSlot;
  slotAlvoCadastro = indexSlot;
  campoId.value = jogador.id_astro || "";
  campoNome.value = jogador.nome || "";
  campoNickname.value = jogador.nickname || "";
  campoIdade.value = jogador.idade || "";
  setGenero(jogador.genero || "");

  if (tituloForm) {
    tituloForm.textContent = `EDITAR ASTRONAUTA — SLOT ${indexSlot + 1}`;
  }
  btnSalvar.textContent = "SALVAR ALTERAÇÕES";
  if (btnCancelarEdicao) {
    btnCancelarEdicao.hidden = false;
  }
  mostrarFormulario();
}

async function salvarAstronauta(evento) {
  evento.preventDefault();

  const nome = campoNome.value.trim();
  const nickname = campoNickname.value.trim();
  const idade = Number(campoIdade.value);
  const genero = getGenero();

  if (!nome) {
    alert("Informe o nome do astronauta.");
    campoNome.focus();
    return;
  }

  if (!nickname) {
    alert("Informe o seu nick.");
    campoNickname.focus();
    return;
  }

  if (
    campoIdade.value.trim() === "" ||
    !Number.isFinite(idade) ||
    idade < 18 ||
    idade > 50
  ) {
    alert("A idade deve estar entre 18 e 50 anos.");
    campoIdade.focus();
    return;
  }

  if (!genero) {
    alert("Selecione o gênero.");
    return;
  }

  const slotAtual = editandoIndex !== null ? editandoIndex : slotAlvoCadastro;
  const registroExistente = slots[slotAtual];
  const scoreAtual = registroExistente && typeof registroExistente.score === "number"
    ? registroExistente.score
    : 0;

  const dadosBanco = {
    nome: nome,
    nickname: nickname,
    idade: idade,
    genero: genero,
    score: scoreAtual
  };

  let astronautaSalvo = {
    id_astro: registroExistente && registroExistente.id_astro ? registroExistente.id_astro : Date.now(),
    ...dadosBanco
  };

  if (clienteSupabase) {
    if (editandoIndex !== null && registroExistente && registroExistente.id_astro) {
      const respostaUpdate = await clienteSupabase
        .from("astronauta")
        .update(dadosBanco)
        .eq("id_astro", registroExistente.id_astro)
        .select();

      if (respostaUpdate.error) {
        console.error("Erro ao atualizar no Supabase:", respostaUpdate.error);
        alert("Não foi possível atualizar no banco de dados.");
        return;
      }
      if (respostaUpdate.data && respostaUpdate.data.length > 0) {
        astronautaSalvo = respostaUpdate.data[0];
      }
    } else {
      const respostaInsert = await clienteSupabase
        .from("astronauta")
        .insert([dadosBanco])
        .select();

      if (respostaInsert.error) {
        console.error("Erro ao inserir no Supabase:", respostaInsert.error);
        alert("Não foi possível salvar no banco de dados.");
        return;
      }
      if (respostaInsert.data && respostaInsert.data.length > 0) {
        astronautaSalvo = respostaInsert.data[0];
      }
    }
  }

  slots[slotAtual] = astronautaSalvo;
  salvarSlotsLocal();
  definirJogadorAtual(astronautaSalvo);

  const foiEdicao = editandoIndex !== null;
  editandoIndex = null;
  limparFormulario();
  mostrarSlots();

  alert(foiEdicao ? "Ficha atualizada com sucesso!" : "Astronauta cadastrado com sucesso!");
}

function renderizarSlots() {
  listaJogadores.innerHTML = "";

  const ocupados = slots.filter((item) => item !== null).length;
  contador.textContent = `${ocupados} / ${CONFIG.totalSlots} SLOTS PREENCHIDOS`;

  for (let i = 0; i < CONFIG.totalSlots; i++) {
    const jogador = slots[i];

    if (!jogador) {
      const vazio = document.createElement("article");
      vazio.className = "card-vazio";

      const tag = document.createElement("span");
      tag.className = "slot-tag";
      tag.textContent = `SLOT ${i + 1} • VAZIO`;

      const icone = document.createElement("div");
      icone.className = "icone-vazio";
      icone.textContent = "";

      const texto = document.createElement("p");
      texto.className = "texto-vazio";
      texto.textContent = "Nenhum astronauta neste slot";

      const btnNovo = document.createElement("button");
      btnNovo.type = "button";
      btnNovo.className = "btn-criar-slot";
      btnNovo.textContent = "CADASTRAR AQUI";
      btnNovo.addEventListener("click", () => abrirCadastroNoSlot(i));

      vazio.append(tag, icone, texto, btnNovo);
      listaJogadores.appendChild(vazio);
      continue;
    }

    const card = document.createElement("article");
    card.className = "card";

    const topo = document.createElement("div");
    topo.className = "card-topo";

    const identidade = document.createElement("div");
    identidade.className = "card-identidade";

    const iconeGenero = document.createElement("div");
    iconeGenero.className = "icone-genero";
    iconeGenero.textContent = obterIconeGenero(jogador.genero);
    iconeGenero.title = `Gênero: ${jogador.genero}`;

    const titulo = document.createElement("h3");
    titulo.textContent = jogador.nickname;

    identidade.append(iconeGenero, titulo);

    const slotLabel = document.createElement("span");
    slotLabel.className = "slot-tag";
    slotLabel.textContent = `SLOT ${i + 1}`;

    topo.append(identidade, slotLabel);

    const info = document.createElement("div");
    info.className = "card-info";

    const nomeP = document.createElement("p");
    nomeP.innerHTML = `<strong>Nome:</strong> ${jogador.nome}`;

    const idadeP = document.createElement("p");
    idadeP.innerHTML = `<strong>Idade:</strong> ${jogador.idade}`;

    const generoP = document.createElement("p");
    generoP.innerHTML = `<strong>Gênero:</strong> ${jogador.genero}`;

    const scoreP = document.createElement("p");
    scoreP.className = "score-destaque";
    scoreP.innerHTML = `<strong>Score Cadastrado:</strong> ${jogador.score ?? 0}`;

    info.append(nomeP, idadeP, generoP, scoreP);

    const acoes = document.createElement("div");
    acoes.className = "acoes";

    const btnJogar = document.createElement("button");
    btnJogar.type = "button";
    btnJogar.className = "btn-jogar-ficha";
    btnJogar.textContent = "Jogar";
    btnJogar.addEventListener("click", () => jogarComSlot(i));

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn-editar-ficha";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => abrirEdicaoDoSlot(i));

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "botao-excluir";
    btnExcluir.textContent = "Excluir";
    btnExcluir.addEventListener("click", () => excluirSlot(i));

    acoes.append(btnJogar, btnEditar, btnExcluir);
    card.append(topo, info, acoes);
    listaJogadores.appendChild(card);
  }
}

async function excluirSlot(indexSlot) {
  const jogador = slots[indexSlot];
  if (!jogador) return;

  const confirmou = confirm(`Deseja excluir a ficha de "${jogador.nickname}"? Os dados serão perdidos.`);
  if (!confirmou) return;

  if (clienteSupabase && jogador.id_astro) {
    const resposta = await clienteSupabase
      .from("astronauta")
      .delete()
      .eq("id_astro", jogador.id_astro);

    if (resposta.error) {
      console.error("Erro ao excluir no Supabase:", resposta.error);
      alert("Não foi possível excluir do banco de dados.");
      return;
    }
  }

  slots[indexSlot] = null;
  salvarSlotsLocal();

  const atualSalvo = localStorage.getItem(CONFIG.chaveLocalStorage);
  if (atualSalvo) {
    try {
      const parsed = JSON.parse(atualSalvo);
      if (parsed && parsed.id_astro === jogador.id_astro) {
        localStorage.removeItem(CONFIG.chaveLocalStorage);
        localStorage.removeItem(CONFIG.chaveJogadorAtual);
      }
    } catch (_) {}
  }

  renderizarSlots();
  alert("Slot esvaziado com sucesso!");
}

function limparFormulario() {
  formulario.reset();
  campoId.value = "";
  setGenero("");
  btnSalvar.textContent = "ENVIAR";
}

function jogarComSlot(indexSlot) {
  const jogador = slots[indexSlot];
  if (!jogador) {
    alert("Este slot está vazio.");
    return;
  }

  try {
    definirJogadorAtual(jogador);
    window.location.href = CONFIG.paginaJogo;
  } catch (erro) {
    console.error("Erro ao iniciar o jogo:", erro);
    alert("Não foi possível iniciar o jogo.");
  }
}