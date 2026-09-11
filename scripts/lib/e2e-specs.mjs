/**
 * O que o gate roda: os specs que PODEM ficar verdes sem o backend.
 *
 * 🚨 ESTE ARQUIVO JÁ DIZIA QUE O CONJUNTO COMPLETO NÃO SERVE DE GATE, e o job
 * bloqueante rodava o conjunto completo assim mesmo. O resultado era um job
 * vermelho todo dia por motivo conhecido e documentado — a esteira que se
 * aprende a ignorar, que é pior que não ter esteira.
 *
 * A separação abaixo não é opinião: é a medição do run 33968188992 de
 * 2026-09-05, o primeiro depois do conserto de fuso horário (#23) e fora da
 * janela das 21h. `40 passed · 20 failed`, e as 20 caem em quatro specs.
 */
export const SPECS_DE_GATE = [
  // Usa `mockApi` do harness: nao precisa do backend em :8000, logo serve de
  // gate. Prende a navegacao do mapa, que e o centro da rodada de 2026-09-06.
  "mapa.navegavel.spec.ts",
  "auth.proxy-cookie.spec.ts",
  "cadastro.funil.spec.ts",
  "study-import.smoke.spec.ts",
  // 🚨 ENTRA AQUI PORQUE NAO HA OUTRO SITIO ONDE CORRA.
  //
  // Descobri ao conferir o verde do PR #73: a CI invoca `test:e2e:smoke` (esta
  // lista) e `test:e2e:auth` (dois specs por nome). `--completo` e' escape
  // MANUAL, para quem esta a consertar -- nenhum job o chama. Ou seja,
  // `SPECS_ADIADOS` tambem nao roda, e os ~20 specs fora das duas listas nao
  // rodam em lado nenhum.
  //
  // Um guard de estouro horizontal que nao executa e' pior que nao ter guard:
  // parece cobertura. Foi exatamente assim que o defeito do pos-simulado
  // entrou -- `assertNoOverflow` existia e visitava outras oito rotas.
  //
  // 🚨 ESTA LISTA NAO E' O GATE DE PR. Eu escrevi aqui, e disse ao operador,
  // que entrar nela punha o spec a correr "sem poder deixar a `main` vermelha".
  // E' falso: `ci.yml` -- o "CI (gate de PR)" -- nao tem job de e2e NENHUM.
  // Quem corre `test:e2e:smoke` e' `ci-full.yml`, que dispara em push para
  // `main`, `workflow_dispatch` e cron semanal. Ou seja, um spec desta lista
  // corre DEPOIS do merge -- exatamente onde pode deixar a `main` vermelha.
  //
  // A mitigacao, e a regra daqui para a frente: `workflow_dispatch` do pipeline
  // completo na branch, e exigir verde ali ANTES de mergear.
  //
  // ✅ Promovido com a regra cumprida: verde em execucoes SEGUIDAS (runs
  // 34465685249 e 34466435968), nao numa corrida so' -- foi promover por UMA
  // que devolveu o `banco.historico` para os adiados.
  //
  // Segue a montagem do `sessao.pos-prova.spec.ts`, que renderiza ESTA tela e
  // corre no mesmo job: so' `mockFinalizedSession(page)`. A versao anterior
  // copiava a receita do `mapa.navegavel` (`mockApi`, o catch-all) e falhou
  // duas corridas sem nunca renderizar a tela -- receita de outra tela nao
  // prova nada sobre esta.
  "sem-estouro-horizontal.spec.ts",
  // O filtro de banca do mapa. Entra aqui porque o `mapa.navegavel` NAO TEM
  // COMO ve-lo: o fixture do harness declara UMA prova, e com uma so' os chips
  // nao renderizam de proposito. Acrescentar a assercao la' mediria zero --
  // exatamente o defeito de "teste que afirma um proxy".
  //
  // Ele monta como o `mapa.navegavel` (o vizinho que ja passa nesta tela):
  // `mockApi` primeiro, e o `page.route` da prova-alvo depois, porque no
  // Playwright a rota registada por ultimo ganha.
  "mapa.filtro-de-banca.spec.ts",
  // 🚨 A HOME NOVA NAO TINHA COBERTURA NENHUMA QUE EXECUTASSE.
  //
  // `/inicio` e` `DEFAULT_AUTHENTICATED_ROUTE`: login, fim do onboarding,
  // fallback do `RedirectIfAuthenticated` e `start_url` do app instalado vao
  // todos para la`. Os dois specs que a mencionavam (`navigation.shell` e
  // `promessas-do-laco`) estao em SPECS_ADIADOS e nao correm -- ou seja, uma
  // regressao na tela que TODO login abre passaria verde.
  "inicio.smoke.spec.ts",
  // 🚨 DOIS DEFEITOS QUE NENHUM GUARD VIA.
  //
  // O primeiro: num tablet TACTIL de 768-1023px nao havia navegacao nenhuma.
  // Os dois portoes mediam coisas diferentes -- o de JS exige 1024px ou
  // ponteiro fino sem toque, o de CSS escondia a barra a partir de 768px.
  //
  // O segundo: `--nav-stack-height` vivia apenas num `<div>` dentro do
  // `AppShell`, e quem flutua sobre o rodape sem descender dele (`<Toast />`,
  // `<BuildVersionBadge />`, qualquer `Portal`) lia o `0px` de `:root` e
  // tapava a navegacao.
  //
  // ⚠️ Entra no gate porque `assertNoOverflow` IGNORA `position: fixed`: o
  // guard que ja existe nao ve nada disto, por construcao. E mede TOKEN, e
  // nao a caixa de um botao, porque os dois botoes reportados pelo operador
  // precisam de estado que este gate nao tem (flashcards desligados no build
  // do e2e; o calendario exige dia selecionado). Medir a causa cobre todos.
  "barra-inferior-e-acoes.spec.ts",
];

/**
 * O que ainda não serve de gate, com a causa MEDIDA de cada um.
 *
 * ⚠️ As duas causas são diferentes e pedem consertos diferentes — juntá-las sob
 * "e2e quebrado" foi o que manteve as duas sem dono:
 *
 *   * três dependem do backend em `:8000`. Sem a API, o `AppShell` não resolve
 *     `cadastro_completo` nem `access_status`, a escada de bloqueio manda a
 *     sessão para `/cadastro/completar` e as telas caem juntas. Subir a API no
 *     job é epic própria (`docs/production-readiness.md`, Deferred Hardening);
 *   * `navigation.shell` falha em UM teste só, e não é do backend: o baseline
 *     visual versionado é `sidebar-layout-chromium-win32.png`, gerado nesta
 *     estação. O runner é Linux e procura `-linux.png`, que nunca foi gerado.
 *     Conserto: gerar o baseline num runner Linux e commitá-lo. Regerar no
 *     Windows só produz o `-win32` de novo.
 *
 * 🚨 `banco.historico` VOLTOU para esta lista no MESMO dia, e o erro foi meu:
 * promovi ao gate por UMA execução em que ele passou (05/09 de manhã). Na
 * execução seguinte falhou 2 vezes, e na véspera falhara 3. Ele é
 * INTERMITENTE, não verde — e uma corrida só não distingue as duas coisas.
 *
 * Classificar por amostra de tamanho 1 é o mesmo defeito de medir uma regra
 * numa população e aplicá-la noutra. Promover ao gate exige verde em execuções
 * SEGUIDAS, em horários diferentes.
 */
export const SPECS_ADIADOS = {
  "banco.historico.spec.ts": "intermitente: 3 falhas em 04/09, 0 na manhã de 05/09, 2 na tarde",
  "caderno.header-toggle.spec.ts": "precisa do backend em :8000 (9 falhas)",
  "cronograma.smoke.spec.ts": "precisa do backend em :8000 (6 falhas)",
  "revisao-turbo.smoke.spec.ts": "precisa do backend em :8000 (4 falhas)",
  "navigation.shell.spec.ts": "baseline visual so' existe para win32 (1 falha)",
};

