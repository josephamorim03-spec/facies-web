"use client";

/**
 * A DECISÃO QUE ABRE A TELA — e não o terceiro passo recolhido.
 *
 * O modo estava dentro de "3. Modo e carga", o último bloco e fechado no
 * telemóvel. Quem abria `/banco` via primeiro um filtro por área clínica, ou
 * seja: a tela pedia o refinamento antes de perguntar o que a pessoa vinha
 * fazer. Escolher "prova" depois de já ter mexido nos temas é refazer trabalho,
 * porque a prova ignora tema.
 *
 * O modo muda TUDO o que vem depois — o que se filtra, quantas questões, como
 * corrige, e se a taxonomia sequer faz sentido. Decisão dessa ordem vai
 * primeiro, sozinha e sempre visível: nada de `<details>`, porque recolher a
 * decisão é o defeito, não a solução.
 *
 * Cada opção diz **o que entrega**, não como se chama. "Prova institucional /
 * Uma instituição e um ano" descrevia o formulário; "A prova inteira, como ela
 * caiu no dia" descreve o resultado — e é o resultado que decide a escolha.
 */

import { BotaoDeEscolha } from "@/components/ui/BotaoDeEscolha";

import type { TipoDeSessao } from "./FiltersBar";

type Opcao = {
  value: TipoDeSessao;
  label: string;
  entrega: string;
  /** O que a pessoa terá de escolher a seguir. Evita a surpresa do passo oculto. */
  pede: string;
};

const OPCOES: Opcao[] = [
  {
    value: "full_exam",
    label: "Prova",
    entrega: "A prova inteira, como ela caiu no dia.",
    pede: "banca e ano",
  },
  {
    value: "topic",
    label: "Por tópico",
    entrega: "Você escolhe as áreas e os temas.",
    pede: "área e temas",
  },
  {
    value: "kros",
    label: "Treino dirigido",
    entrega: "A Fácies monta pela sua defasagem.",
    pede: "só a ênfase",
  },
];

export function EscolhaDoModo({
  valor,
  onChange,
}: {
  valor: TipoDeSessao;
  onChange: (proximo: TipoDeSessao) => void;
}) {
  return (
    <fieldset className="pb-5">
      <legend className="paper-eyebrow">O que você vai fazer agora</legend>
      <div
        className="mt-2 grid gap-3 md:grid-cols-3"
        role="radiogroup"
        aria-label="Tipo de sessão"
      >
        {/* ⚠️ O ESTADO SAIU DAQUI e passou a ser o `BotaoDeEscolha`.

            Este bloco pintava o escolhido com `border-primary bg-surfaceMuted`
            sobre `border-edge` — o "selecionado" do Mapa é `bg-washSelecao`
            sobre `border-rule`, e é ele que o resto da identidade usa (chip,
            `SegmentedToggle`, etapa do onboarding). Duas gramáticas para o
            mesmo estado, na primeira decisão que o aluno toma no Banco.

            O rodapé continua só no escolhido: anunciar "pede banca e ano" nos
            três ao mesmo tempo transformaria a decisão numa tabela comparativa.
            E continua em `paper-eyebrow`, e não num versal montado à mão com
            `text-[11px]` + tracking — nesta identidade o versal vive só nessa
            classe, e o `check-retro-geometry` cobra. */}
        {OPCOES.map((opcao) => (
          <BotaoDeEscolha
            key={opcao.value}
            escolhido={valor === opcao.value}
            onClick={() => onChange(opcao.value)}
            descricao={opcao.entrega}
            rodape={<span className="paper-eyebrow mt-1 block">a seguir: {opcao.pede}</span>}
          >
            {opcao.label}
          </BotaoDeEscolha>
        ))}
      </div>
    </fieldset>
  );
}
