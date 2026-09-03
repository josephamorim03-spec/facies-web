/**
 * As contas dos cartões da Evolução — artboards `9b` e `12a`.
 *
 * Puras e testáveis de propósito: cada uma responde a UMA das perguntas que o
 * desenho põe como título de cartão, e todas param de responder quando não há
 * base. É a regra que atravessa o produto: *estimativa não é confirmação*.
 */

/** Piso de respostas para o assunto virar diagnóstico, não só número. */
export const PISO_DE_DIAGNOSTICO = 80;

/**
 * Intervalo de Wilson — a faixa do "se a prova fosse hoje".
 *
 * Wilson, e não o erro normal: com `p` perto de 0 ou 1, ou com `n` pequeno, o
 * intervalo normal escapa de [0,1] e o produto passaria a publicar "de −4% a
 * 12%". Wilson é assimétrico e fica dentro do intervalo por construção — que é
 * exatamente a honestidade que o cartão promete ("a faixa é o que N questões
 * permitem afirmar").
 */
export function faixaDeWilson(
  acertos: number,
  total: number,
  z = 1.96,
): { min: number; max: number } | null {
  if (!Number.isFinite(acertos) || !Number.isFinite(total) || total <= 0) return null;
  const n = Math.max(1, Math.trunc(total));
  const p = Math.min(1, Math.max(0, acertos / n));
  const z2 = z * z;
  const denominador = 1 + z2 / n;
  const centro = (p + z2 / (2 * n)) / denominador;
  const margem = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominador;
  return {
    min: Math.max(0, centro - margem),
    max: Math.min(1, centro + margem),
  };
}

export type PesoDaArea = { area: string; pct: number };
export type AcertoDaArea = { area: string; acertos: number; total: number };

export type Projecao = {
  /** Nota projetada, de 0 a 100. */
  nota: number;
  faixaMin: number;
  faixaMax: number;
  /** Respostas que sustentam a projeção. */
  base: number;
};

/**
 * "Se a prova fosse hoje" — o acerto do aluno PONDERADO pelo peso de cada área
 * nesta prova.
 *
 * ⚠️ A média simples estaria errada, e erraria para o lado confortável: quem vai
 * bem em preventiva (9% da prova) e mal em clínica (30%) sairia com uma nota
 * que a prova não daria. O peso é o da banca-alvo, não o do que o aluno estudou.
 *
 * ⚠️ Área sem resposta nenhuma **sai da conta e do denominador**. Contá-la como
 * zero afirmaria que o aluno erraria tudo ali — é "não sei" virando "você é
 * péssimo nisto", o mesmo defeito que o mapa já corrigiu. A projeção passa a
 * valer para a fatia coberta, e o cartão diz qual é.
 */
export function projetarNota(
  pesos: PesoDaArea[],
  acertos: AcertoDaArea[],
): Projecao | null {
  const porArea = new Map(acertos.map((a) => [a.area, a]));
  let pesoCoberto = 0;
  let somaPonderada = 0;
  let base = 0;

  for (const peso of pesos) {
    const medida = porArea.get(peso.area);
    if (!medida || medida.total <= 0) continue;
    pesoCoberto += peso.pct;
    somaPonderada += peso.pct * (medida.acertos / medida.total);
    base += medida.total;
  }

  if (pesoCoberto <= 0 || base <= 0) return null;

  const taxa = somaPonderada / pesoCoberto;
  // A faixa vem do `n` agregado: é o que o conjunto das respostas permite
  // afirmar, e não a soma de sete faixas independentes.
  const faixa = faixaDeWilson(Math.round(taxa * base), base);
  if (!faixa) return null;

  return {
    nota: Math.round(taxa * 100),
    faixaMin: Math.round(faixa.min * 100),
    faixaMax: Math.round(faixa.max * 100),
    base,
  };
}

export type LinhaDeEscape = {
  assunto: string;
  /** Questões que a prova costuma trazer deste assunto. */
  naProva: number;
  acerto: number;
  respostas: number;
  /** Quantas questões da prova o aluno perderia por este assunto. */
  perdidas: number;
  /** Abaixo do piso o número existe, a conclusão não. */
  abaixoDoPiso: boolean;
};

/**
 * "Onde mais escapa" — peso na prova × seu erro, em QUESTÕES.
 *
 * O desenho é explícito: *"não é porcentagem: é quantas questões da prova você
 * perderia por esse assunto"*. Ordenar por acerto recomendaria o assunto que o
 * aluno erra muito e a prova quase não cobra; ordenar por questões perdidas é o
 * que faz a lista valer uma hora de estudo.
 */
export function ondeMaisEscapa(
  assuntos: Array<{ rotulo: string; n: number }>,
  dominio: Map<string, { mastery: number; attempts: number }>,
  limite = 5,
): LinhaDeEscape[] {
  return assuntos
    .flatMap((assunto) => {
      const meu = dominio.get(assunto.rotulo);
      // Sem resposta nenhuma não há erro medido — e supor erro máximo faria o
      // assunto nunca aberto liderar a lista de "onde você mais perde".
      if (!meu || meu.attempts <= 0) return [];
      const erro = Math.min(1, Math.max(0, 1 - meu.mastery));
      return [
        {
          assunto: assunto.rotulo,
          naProva: assunto.n,
          acerto: meu.mastery,
          respostas: meu.attempts,
          perdidas: Math.round(assunto.n * erro * 10) / 10,
          abaixoDoPiso: meu.attempts < PISO_DE_DIAGNOSTICO,
        },
      ];
    })
    .filter((linha) => linha.perdidas > 0)
    .sort((a, b) => b.perdidas - a.perdidas)
    .slice(0, limite);
}

export type SemanaDeAcerto = { rotulo: string; acerto: number | null; questoes: number };

/**
 * "Estou melhorando?" — as últimas N semanas, na ordem do tempo.
 *
 * Semana sem questão nenhuma entra com `acerto: null` em vez de sumir: o desenho
 * mostra os recuos de propósito (*"semana ruim é normal e fica à mostra"*), e
 * uma série que esconde os buracos vira uma linha sempre subindo.
 */
export function acertoPorSemana(
  semanas: Array<{ week_label: string; total: number; accuracy_pct: number | null }>,
  quantas = 6,
): SemanaDeAcerto[] {
  return semanas.slice(-quantas).map((semana) => ({
    rotulo: semana.week_label,
    acerto: semana.total > 0 ? (semana.accuracy_pct ?? null) : null,
    questoes: semana.total,
  }));
}

export type DiaDoMosaico = {
  data: string;
  /** `cheio` = sessão inteira · `parcial` = parte dela · `vazio` = sem estudo. */
  estado: "cheio" | "parcial" | "vazio";
  minutos: number;
};

/**
 * "Seus dias" — o mosaico que **acumula e nunca zera**.
 *
 * Sem sequência que quebra, sem dia vermelho, sem "você perdeu o seu progresso".
 * Quem trabalha em escala vai falhar dias, e um app que castiga isso é
 * abandonado na terceira semana. Aqui o dia vazio é só ausência de tinta.
 *
 * O corte entre `cheio` e `parcial` é o piso de continuidade do motor (10 min),
 * recebido de fora para não virar um quarto lugar onde esse número mora.
 */
export function mosaicoDeDias(
  pontos: Array<{ bucket: string; observed_minutes?: number | null }>,
  pisoDeMinutos: number,
  metaDiariaMinutos = 30,
): DiaDoMosaico[] {
  return pontos.map((ponto) => {
    const minutos = Math.max(0, Math.trunc(ponto.observed_minutes ?? 0));
    const estado: DiaDoMosaico["estado"] =
      minutos >= metaDiariaMinutos ? "cheio" : minutos >= pisoDeMinutos ? "parcial" : "vazio";
    return { data: ponto.bucket, estado, minutos };
  });
}

/** "1:52 por questão" — segundos viram minuto:segundo, sempre com dois dígitos. */
export function ritmoPorExtenso(minutosPorQuestao: number): string {
  if (!Number.isFinite(minutosPorQuestao) || minutosPorQuestao <= 0) return "—";
  const total = Math.round(minutosPorQuestao * 60);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${String(segundos).padStart(2, "0")}`;
}
