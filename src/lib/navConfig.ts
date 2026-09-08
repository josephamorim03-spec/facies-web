/**
 * A taxonomia da navegação do aluno — CINCO destinos, no vocabulário do
 * prontuário.
 *
 * ## Por que esta língua, e não outra
 *
 * Um caso clínico se lê em três tempos: você EXAMINA, decide a CONDUTA, e
 * acompanha a EVOLUÇÃO. É a estrutura do prontuário, e é a única em que o
 * estudante de medicina já pensa sem traduzir.
 *
 * As duas taxonomias anteriores erravam pelo mesmo motivo — nomeavam algo que
 * não era a cabeça de quem usa:
 *
 * - "Hoje · Banco · Evolução · Rotina · Conta" nomeava a NOSSA arquitetura.
 *   "Banco" é o acervo, não o que se faz com ele; "Rotina" e "Conta" eram a
 *   mesma pergunta ("como o produto se ajusta a mim") ocupando dois pesos
 *   permanentes de barra para tarefas que se fazem poucas vezes por ano.
 * - "Rota · Treino · Mapa · Dados · Você" pedia emprestada uma metáfora de GPS
 *   que só cobria DUAS das cinco abas. Metáfora que não fecha vira tema.
 *
 * ## O que cada aba responde
 *
 * | aba | a pergunta |
 * | --- | --- |
 * | Conduta | o que eu faço agora, e por quê |
 * | Prática | (o trabalho em si) |
 * | Mapa | como é o território |
 * | Evolução | como eu venho indo |
 * | Você | quem eu sou para o produto |
 *
 * O Mapa fica no MEIO de propósito: ele é o exame — o território que se olha
 * antes de decidir a conduta e depois de praticar.
 *
 * ⚠️ As chaves de `StudentIntent` acompanham os rótulos. O motor do backend
 * continua se chamando `navigation_route`; o que mudou foi o vocabulário da
 * INTERFACE, e deixar as chaves em inglês desalinhadas dos rótulos foi
 * justamente o que fez "Banco" sobreviver dois redesenhos.
 */
export type StudentIntent =
  | "conduta"
  | "pratica"
  | "mapa"
  | "evolucao"
  | "voce";

export type StudentNavIcon = StudentIntent;

export type StudentRouteConfig = {
  path: string;
  title: string;
  shortLabel: string;
  intent: StudentIntent;
  intentPath: string;
  breadcrumb: string[];
  warmup: StudentIntent;
  icon: StudentNavIcon;
};

export type NavItemConfig = {
  href: string;
  label: string;
  shortLabel: string;
  groupPaths: string[];
  icon: StudentNavIcon;
};

export type NavGroupConfig = { items: NavItemConfig[] };
export type NavChildConfig = {
  href: string;
  label: string;
  /**
   * Rótulo da LINHA de seções, quando o título da página não cabe nela.
   *
   * `label` continua sendo o título (topo do celular, breadcrumb); este campo é
   * só a etiqueta do botão. Existe por medida: a linha de filhos do mobile é
   * `flex-1` sem rolagem, então em 390px três botões têm ~120px cada — "O plano
   * até a prova" não cabe, "Plano" cabe. Quem lê a linha já sabe em que aba
   * está; quem lê o título pode ter chegado por link.
   */
  shortLabel?: string;
  matches: string[];
};

/**
 * Os flashcards estão fora de produção, e saem SÓ DA PORTA.
 *
 * `NEXT_PUBLIC_FLASHCARDS` (default "0", declarado em `next.config.js`) tira o
 * link. O par obrigatório é `FLASHCARDS_ENABLED` no backend, que impede a
 * agenda de oferecer o bloco "Revisar cards no ponto" — uma chave sem a outra
 * deixa metade da feature ligada.
 *
 * ⚠️ Com a chave desligada, `/cards` deixa de ter ROTA no registro, e não só
 * link: ele é 307 para `/hoje` em `next.config.js`, então ninguém para nele e
 * uma rota registrada só serviria para o menu carregar estado ativo de uma URL
 * inalcançável. Religar é virar a env — não há código a reescrever, que era a
 * condição do "deixar de molho".
 */
// A chave mora em `flags.ts` e e' IMPORTADA, nao redeclarada. Seis modulos
// ja' a consomem de la' (`PostExamReview`, `dayActivitySummary`,
// `GraficosSection`, `useGraficosData`, `preferencias/page`, e este) -- uma
// copia local aqui seria a setima definicao da mesma flag, e duas fontes
// para a mesma verdade divergem no dia em que uma delas muda.
//
// ⚠️ Import RELATIVO E COM EXTENSAO. Este modulo e' lido pelo runner de
// testes (`node --test --experimental-strip-types`), que NAO resolve o alias
// `@/` -- sem a extensao, `navConfig.test.mjs` morre inteiro em
// ERR_MODULE_NOT_FOUND antes de correr um assert.
// ⚠️ CONST INLINE, e nao `import ... from "./flags.ts"` como no `faciesapp`.
// Este repositorio NAO tem `src/lib/flags.ts` -- a extracao aconteceu la' e
// nao veio junto na separacao. Portar o import quebraria o modulo inteiro
// em ERR_MODULE_NOT_FOUND, e o runner de testes (`node --test
// --experimental-strip-types`) morreria antes de correr um assert.
//
// Quando `flags.ts` existir aqui, esta const vira import -- e ai' o motivo
// e' o mesmo de la': uma copia local seria uma segunda fonte para a mesma
// verdade.
const FLASHCARDS_LIGADOS = process.env.NEXT_PUBLIC_FLASHCARDS === "1";

const INTENTS: Record<
  StudentIntent,
  { path: string; label: string; icon: StudentNavIcon }
> = {
  // ⚠️ A URL continua `/hoje`, e a divergência é DELIBERADA.
  //
  // `/rota` seria o nome óbvio de um destino chamado percurso, e foi cogitado.
  // Ele está queimado: `next.config.js` emite `/rota → /hoje` como 308
  // PERMANENTE, e o navegador de quem já visitou guarda 308 sem pedir de novo.
  // Reaproveitar a URL prenderia em `/hoje` exatamente o aluno antigo.
  //
  // Com "Conduta" o problema nem chega a existir — a aba é a Conduta, a SEÇÃO
  // continua sendo "Hoje", e é a seção que aparece no topo do celular. Mesmo
  // arranjo de Prática › Questões › `/banco`.
  conduta: { path: "/hoje", label: "Conduta", icon: "conduta" },
  // Guarda-chuva que "Questões" não podia ser: a aba tem questão, flashcard,
  // guardadas e histórico. "Banco" descrevia o acervo, não o ato.
  pratica: { path: "/banco", label: "Prática", icon: "pratica" },
  // `9a` "O mapa da prova": a fácies da banca-alvo do aluno, dentro do app.
  mapa: { path: "/mapa", label: "Mapa", icon: "mapa" },
  // Em medicina, "evolução" é a nota de acompanhamento do paciente — no
  // registro clínico o nome é exato. É também o nome do artboard `9b`.
  evolucao: { path: "/evolucao", label: "Evolução", icon: "evolucao" },
  // `12c` "Conta e assinatura", mais as preferências que `/preferencias`
  // guardava sem lhes pertencer. A rotina NÃO vem para cá: ela é insumo do dia
  // e ficou na Conduta, que é o artboard `14a` respeitado ao pé da letra.
  voce: { path: "/conta", label: "Você", icon: "voce" },
};

/**
 * Filhos de cada aba. São eles que dão título à página: com o Cronograma
 * morando sob Conduta, o título não pode mais vir do rótulo da aba pai.
 *
 * `matches` só aceita caminho que o navegador consegue RENDERIZAR. Um 308 de
 * `next.config.js` resolve antes do roteamento de arquivos, então o aluno nunca
 * para nessas URLs e a entrada nunca casaria com nada.
 */
const CHILDREN: Record<StudentIntent, NavChildConfig[]> = {
  conduta: [
    { href: "/hoje", label: "Hoje", matches: ["/hoje"] },
    // O artboard `14a` desenha "Minha semana" e "O plano até a prova" como duas
    // abas da MESMA tela. Separá-las em destinos de barra foi o que criou a
    // "Rotina" de antes: peso permanente para uma tela que se mexe uma vez por
    // mês. Como seções da Conduta, a causa fica alcançável a partir do efeito.
    {
      href: "/preferencias",
      label: "Minha semana",
      shortLabel: "Semana",
      matches: ["/preferencias"],
    },
    {
      // O `9c` é a LEITURA do plano (fases, o que não coube, quanto a rotina
      // comporta). `/cronograma` continua existindo e continua sendo onde se
      // arrasta atividade entre dias — ele vira ferramenta, e não destino.
      href: "/plano",
      label: "O plano até a prova",
      shortLabel: "Plano",
      matches: ["/plano", "/cronograma", "/agenda-operacional"],
    },
  ],
  pratica: [
    { href: "/banco", label: "Questões", matches: ["/banco"] },
    // ⚠️ O Caderno (`/cards/registros`) entra pelo `matches` do Flashcards, e
    // não como quinto botão: a linha do mobile é `flex-1` sem rolagem, e cinco
    // botões em 390px estouram o container (há teste `e2e` que prende isto).
    // Quando os flashcards voltarem, o Caderno precisa de porta DENTRO de
    // `/cards` — decisão do turno que religar a chave.
    ...(FLASHCARDS_LIGADOS
      ? [
          {
            href: "/cards",
            label: "Flashcards",
            matches: ["/cards", "/cards/registros"],
          },
        ]
      : []),
    // A lista de guardadas mora sob a Prática, e não na barra: o desenho fixa
    // cinco destinos e o sexto não caberia em 390px. E guardadas é uma forma de
    // olhar o acervo, não um lugar diferente dele.
    { href: "/banco/guardadas", label: "Guardadas", matches: ["/banco/guardadas"] },
    { href: "/banco/historico", label: "Histórico", matches: ["/banco/historico"] },
  ],
  // Sem seções por decisão, não por omissão: o Mapa é superfície de exploração
  // livre, e dar sub-abas a ele seria transformar navegação em menu.
  mapa: [],
  // Sem filhos: `/estatisticas` é caminho legado da própria tela.
  evolucao: [],
  // ✅ A DIVISÃO ACONTECEU. `preferencias/page.tsx` tinha 886 linhas e misturava
  // duas naturezas: rotina (o insumo que dimensiona o dia, e por isso vive na
  // Conduta) e preferência (o produto se ajustando a quem você é, que é daqui).
  // Enquanto dividiam um arquivo, metade delas aparecia na aba errada.
  voce: [
    { href: "/conta", label: "Conta", matches: ["/conta"] },
    {
      href: "/conta/preferencias",
      label: "Preferências",
      matches: ["/conta/preferencias"],
    },
  ],
};

/**
 * Caminhos legados que o navegador ainda RENDERIZA e que precisam acender a
 * aba certa. `/kros` e `/rota` NÃO entram: os dois são 308 para `/hoje`, então
 * ninguém para neles. `/provas` também sai — ele redireciona por conta própria
 * para o histórico.
 */
const LEGACY_PATHS: Record<StudentIntent, string[]> = {
  conduta: [
    // ⚠️ CINCO ENTRADAS SAIRAM DAQUI, e a regra que as tirou e a do topo deste
    // bloco: so entra caminho que o navegador consegue RENDERIZAR.
    //
    // `/today`, `/semana`, `/desempenho` e `/rotina-e-metas` viraram redirect em
    // `next.config.js`, e `/trilha` perdeu ate o diretorio — as cinco paginas
    // foram apagadas. O redirect resolve ANTES do roteamento de arquivos, entao
    // o aluno nunca para nessas URLs: o menu carregava estado ativo para lugar
    // que ninguem alcanca, e o guard `check-links-internos` reprovava por isso.
    "/onboarding",
    "/cronograma",
    "/agenda-operacional",
  ],
  pratica: [],
  mapa: [],
  evolucao: ["/estatisticas"],
  // ⚠️ `/voce` NAO E' LEGADO, e entra aqui pelo que esta lista faz, nao pelo
  // nome dela: registrar caminho que o navegador RENDERIZA e que precisa
  // acender a aba certa.
  //
  // Ele e o hub que substituiu a linha de secoes no rodape (a barra do celular
  // perdeu a segunda fileira). Sem esta entrada ele resolvia para `null`:
  // medido — titulo vazio no topo do celular, NENHUMA aba acesa, e sem
  // pre-aquecimento. O aluno ficava numa tela e a barra nao dizia onde ele
  // estava. E' o mesmo defeito que o teste de `/conta` ja descreve: tirar da
  // barra e tirar do registro sao coisas diferentes.
  voce: ["/voce"],
};

/**
 * A ordem da barra: conduta · prática · mapa · evolução · você.
 *
 * Ela também monta a tabela de rotas (`STUDENT_ROUTES`): tirar uma intenção
 * daqui faz as URLs dela deixarem de RESOLVER, e não só sumirem do menu.
 *
 * Alterar esta ordem exige atualizar `tests/unit/navConfig.test.mjs` e
 * `tests/e2e/navigation.shell.spec.ts`.
 */
const INTENT_ORDER: StudentIntent[] = [
  "conduta",
  "pratica",
  "mapa",
  "evolucao",
  "voce",
];

function normalizePathname(pathname: string): string {
  const [withoutHash] = pathname.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+$/, "");
}

function matchLength(pathname: string, candidate: string): number {
  const normalized = normalizePathname(pathname);
  const target = normalizePathname(candidate);
  if (normalized === target || normalized.startsWith(`${target}/`)) return target.length;
  return -1;
}

function route(
  path: string,
  title: string,
  intent: StudentIntent,
): StudentRouteConfig {
  const parent = INTENTS[intent];
  return {
    path,
    title,
    shortLabel: title,
    intent,
    intentPath: parent.path,
    breadcrumb: [parent.label],
    warmup: intent,
    icon: parent.icon,
  };
}

export const STUDENT_ROUTES: StudentRouteConfig[] = [
  // Um filho por rota real: o título vem do filho, não do pai.
  ...INTENT_ORDER.flatMap((intent) =>
    CHILDREN[intent].map((child) => route(child.href, child.label, intent)),
  ),
  // Abas sem filho carregam o próprio rótulo.
  ...INTENT_ORDER.filter((intent) => CHILDREN[intent].length === 0).map((intent) =>
    route(INTENTS[intent].path, INTENTS[intent].label, intent),
  ),
  ...INTENT_ORDER.flatMap((intent) =>
    LEGACY_PATHS[intent].map((path) => route(path, INTENTS[intent].label, intent)),
  ),
];

export function getStudentRoute(pathname: string): StudentRouteConfig | null {
  const normalized = normalizePathname(pathname);
  return (
    STUDENT_ROUTES.slice()
      .sort((a, b) => b.path.length - a.path.length)
      .find(
        (item) =>
          normalized === item.path || normalized.startsWith(`${item.path}/`),
      ) ?? null
  );
}

/**
 * Título da tela: o rótulo da SEÇÃO ativa primeiro, o da rota depois.
 *
 * A ordem importa desde que a Rotina virou seção da Conduta. `/cronograma` é
 * caminho legado da aba, e herdar o rótulo do pai passou a chamar o calendário
 * de "Conduta" — que não é nem verdade nem útil. A seção ativa dele é "O plano
 * até a prova", que é o que ele de fato mostra.
 */
export function getStudentPageTitle(pathname: string): string {
  return getActiveChildLabel(pathname) ?? getStudentRoute(pathname)?.title ?? "";
}

export function getStudentWarmupIntent(pathname: string): StudentIntent | null {
  return getStudentRoute(pathname)?.warmup ?? null;
}

function intentForPathname(pathname: string): StudentIntent | null {
  let best: StudentIntent | null = null;
  let bestLen = -1;
  for (const intent of INTENT_ORDER) {
    const candidates = [
      INTENTS[intent].path,
      ...LEGACY_PATHS[intent],
      ...CHILDREN[intent].flatMap((child) => child.matches),
    ];
    for (const candidate of candidates) {
      const len = matchLength(pathname, candidate);
      if (len > bestLen) {
        bestLen = len;
        best = intent;
      }
    }
  }
  return best;
}

export function getIntentChildren(pathname: string): NavChildConfig[] {
  const intent = intentForPathname(pathname);
  return intent ? CHILDREN[intent] : [];
}

/** Etiqueta do botão na linha de seções; cai no título quando não há versão curta. */
export function navChildShortLabel(item: NavChildConfig): string {
  return item.shortLabel ?? item.label;
}

/**
 * Filho ativo por casamento MAIS ESPECÍFICO.
 *
 * Prefixo simples não serve aqui: `/banco/historico` casa com `/banco` e com
 * `/banco/historico` ao mesmo tempo, e as duas seções acenderiam. Vence o alvo
 * mais longo.
 */
function activeChild(pathname: string): NavChildConfig | null {
  const children = getIntentChildren(pathname);
  let best: NavChildConfig | null = null;
  let bestLen = -1;
  for (const child of children) {
    for (const candidate of child.matches) {
      const len = matchLength(pathname, candidate);
      if (len > bestLen) {
        bestLen = len;
        best = child;
      }
    }
  }
  return best;
}

export function isNavChildActive(pathname: string, item: NavChildConfig): boolean {
  return activeChild(pathname)?.href === item.href;
}

export function getActiveChildLabel(pathname: string): string | null {
  return activeChild(pathname)?.label ?? null;
}

export function isNavItemActive(pathname: string, item: NavItemConfig): boolean {
  const normalized = normalizePathname(pathname);
  return item.groupPaths.some((groupPath) => {
    const target = normalizePathname(groupPath);
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

function navItem(intent: StudentIntent): NavItemConfig {
  const config = INTENTS[intent];
  return {
    href: config.path,
    // ⚠️ A VERSAL É DO CSS, e este campo existe porque `label` também vira
    // título de página e breadcrumb — "você está em CONDUTA" não se escreve
    // assim. O checker de copy pt-BR lê o DOM, que segue acentuado.
    label: config.label.toUpperCase(),
    shortLabel: config.label,
    groupPaths: [
      config.path,
      ...LEGACY_PATHS[intent],
      ...CHILDREN[intent].map((child) => child.href),
    ],
    icon: config.icon,
  };
}

// Uma barra só, sem divisórias: no mobile isto é a barra inferior de cinco abas
// e no desktop é o menu bar horizontal. A taxonomia é a MESMA nos dois — menu,
// título e URL dizem a mesma coisa.
export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  { items: INTENT_ORDER.map(navItem) },
];

export const NAV_ITEMS: NavItemConfig[] = NAV_GROUPS_CONFIG[0].items;
