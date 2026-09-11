/**
 * QUEM DECIDE A ORDEM DO INÍCIO — e por quê.
 *
 * ## A escolha do operador
 *
 * Perguntado se a ordem dos blocos devia ser configurável, ele respondeu **"o
 * sistema decide sozinho"**. Isto é esse sistema, e ele é uma função pura de
 * propósito: uma regra de prioridade espalhada por condicionais dentro do JSX
 * não se lê, não se testa, e é onde "às vezes o bloco some" nasce sem que
 * ninguém consiga dizer quando.
 *
 * ## As regras, e a razão de cada uma
 *
 * A ordem não é uma pontuação com pesos ajustáveis — é uma cascata de perguntas
 * em ordem de urgência. Pontuação com pesos parece mais sofisticada e é pior
 * aqui: ninguém consegue explicar ao aluno por que o bloco desceu, e ninguém
 * consegue reproduzir o caso quando ele reclama.
 *
 * 1. **Sessão aberta vence tudo.** Não se abre frente nova com uma aberta — é a
 *    mesma regra que já governa o `TodayPrimaryAction`, que cede a primária
 *    quando há sessão a retomar. Aqui ela decide a ordem em vez do
 *    preenchimento.
 * 2. **Sequência em risco vence o resto.** É o único bloco com PRAZO: ele
 *    expira à meia-noite. Um bloco que expira e que aparece depois de três
 *    rolagens é um bloco que não avisou.
 * 3. **A ação do dia** — o trabalho, que é o que a tela existe para começar.
 * 4. **Os assuntos quentes** — o que está a escapar. Vem depois do trabalho
 *    porque é diagnóstico, não tarefa: informa a próxima escolha, não esta.
 * 5. **A evolução** — a leitura mais lenta de todas, e a única que não muda de
 *    um dia para o outro.
 *
 * ## O que NÃO aparece
 *
 * ⚠️ Bloco sem dado não vira bloco vazio nem esqueleto permanente: ele SOME.
 * "Sem base para medir" tem o seu lugar dentro da Evolução, que é uma tela que
 * o aluno abre para medir. O Início é a tela de "o que importa agora", e um
 * cartão que diz "ainda não dá para dizer nada" não importa agora.
 *
 * ⚠️ **A sequência ZERO não aparece.** Mostrar "0 dias" a quem começou ontem é
 * castigo, e o desenho deste produto proíbe castigo por omissão em texto
 * (`Webapp - telas.dc.html:714`, citado no hub do "Mais"). A sequência aparece
 * quando existe — a partir do primeiro dia estudado.
 */

/** O que o Início sabe sobre o aluno, reduzido ao que decide a ordem. */
export type EstadoDoInicio = {
  /** Há sessão de questões por terminar. */
  sessaoAberta: boolean;
  /** O servidor propôs uma próxima ação para hoje. */
  temAcaoDoDia: boolean;
  /** Dias seguidos de estudo. Zero esconde o bloco. */
  sequenciaDias: number;
  /** O dia de hoje ainda não foi cumprido e a sequência cai à meia-noite. */
  sequenciaEmRisco: boolean;
  /**
   * Hoje é dia protegido (plantão declarado na rotina).
   *
   * ⚠️ Protegido tira o RISCO, e não o bloco: o operador pediu explicitamente
   * que o aluno VEJA que o dia está protegido. Um bloco que some no dia de
   * plantão ensina que a proteção não existe.
   */
  diaProtegido: boolean;
  /** Quantos assuntos o diagnóstico longitudinal marcou como fracos ou em risco. */
  assuntosQuentes: number;
  /** Questões respondidas — o piso de diagnóstico da Evolução. */
  questoesRespondidas: number;
};

export type BlocoDoInicio =
  | "continuar"
  | "sequencia"
  | "acaoDoDia"
  | "quentes"
  | "evolucao";

/**
 * O piso para a Evolução dizer alguma coisa.
 *
 * ⚠️ É `PISO_DE_DIAGNOSTICO` da própria Evolução, e não um número novo. Duas
 * telas com pisos diferentes dariam duas respostas para "já dá para medir?" —
 * que é exatamente a divergência que a regra "não há número novo" existe para
 * impedir. Importado, não copiado.
 *
 * ⚠️ IMPORT RELATIVO E COM EXTENSÃO, como em `lib/navConfig.ts` e pelo mesmo
 * motivo: este módulo é lido pelo runner de provas (`node --test
 * --experimental-strip-types`), que NÃO resolve o alias `@/`. Com `@/`, o
 * ficheiro de provas morre inteiro em `ERR_MODULE_NOT_FOUND` antes de correr um
 * assert — medido aqui, não suposto.
 */
import { PISO_DE_DIAGNOSTICO } from "../../evolucao/_lib/leitura.ts";

export { PISO_DE_DIAGNOSTICO };

/**
 * A ordem dos blocos, do mais urgente ao mais lento. Blocos sem dado não entram.
 */
export function ordenarBlocos(estado: EstadoDoInicio): BlocoDoInicio[] {
  const blocos: BlocoDoInicio[] = [];

  // A sequência entra na lista se existir; a POSIÇÃO dela depende do risco.
  const mostraSequencia = estado.sequenciaDias > 0;
  const sequenciaUrgente = mostraSequencia && estado.sequenciaEmRisco && !estado.diaProtegido;

  if (estado.sessaoAberta) blocos.push("continuar");
  if (sequenciaUrgente) blocos.push("sequencia");
  if (estado.temAcaoDoDia) blocos.push("acaoDoDia");
  if (mostraSequencia && !sequenciaUrgente) blocos.push("sequencia");
  if (estado.assuntosQuentes > 0) blocos.push("quentes");
  if (estado.questoesRespondidas >= PISO_DE_DIAGNOSTICO) blocos.push("evolucao");

  return blocos;
}

/**
 * Como o Início fala da sequência hoje.
 *
 * ⚠️ **A PROTEÇÃO TEM DE SER DITA, e é por isso que isto é uma função e não uma
 * classe de CSS.** O operador escolheu, entre três opções, "não quebrar em dia
 * de plantão, mas ficar claro isso no front para o aluno, deixar claro que
 * aquele dia tá protegido". Uma sequência que não cai sem dizer por quê ensina
 * que o número é decorativo — e na primeira vez que ele cair, o aluno vai achar
 * que é defeito.
 *
 * O motor já existe (`app/services/streaks.py`) e o contrato já traz
 * `active_protection`, `weekly_protected_days` e `protection_window_end`. O que
 * faltava era a frase.
 */
export type VozDaSequencia = {
  estado: "protegida" | "em-risco" | "firme";
  frase: string;
};

export function vozDaSequencia(estado: {
  diaProtegido: boolean;
  sequenciaEmRisco: boolean;
  diasProtegidosNaSemana: number;
}): VozDaSequencia {
  if (estado.diaProtegido) {
    return {
      estado: "protegida",
      // Diz as DUAS coisas: que hoje não conta contra, e que a sequência
      // continua. Só a primeira metade soaria a desculpa; só a segunda soaria a
      // erro de contagem.
      frase: "Hoje é dia de plantão: está protegido, e a sua sequência não cai.",
    };
  }
  if (estado.sequenciaEmRisco) {
    return {
      estado: "em-risco",
      frase: "A sequência cai à meia-noite se hoje ficar em branco.",
    };
  }
  if (estado.diasProtegidosNaSemana > 0) {
    const dias = estado.diasProtegidosNaSemana;
    return {
      estado: "firme",
      frase: `Nesta semana, ${dias} ${dias === 1 ? "dia protegido" : "dias protegidos"} de plantão não contaram contra.`,
    };
  }
  return { estado: "firme", frase: "Hoje já conta." };
}
