# As 42 atualizações clínicas estão sem acento

**Achado ao portar a landing v8. Não corrigido — o texto vive no banco, e a
correção é operação.**

## O que o leitor vê

A landing mostra três atualizações com portaria, data e link para o relatório da
CONITEC. Elas chegam assim:

> PCDT Doenca Pulmonar Obstrutiva **Cronica**
> Vacina hexavalente acelular para **criancas** imunodeprimidas
> Testagem molecular para **deteccao** de HPV e rastreamento do **cancer** do colo do **utero**

Numa página que se apoia em rigor — ao lado de uma portaria numerada e de um link
oficial — isso lê como descuido, e **contradiz exatamente o que a página
defende**. É o tipo de detalhe que um médico nota antes de qualquer número.

## Medido

| | |
| --- | --- |
| atualizações em `atualizacoes.json` | **42** |
| com título + resumo **sem nenhum acento** | **42** |
| com palavra que exigiria acento | **42** |

## Não é encoding, e o próprio arquivo prova

Os **subtemas** do mesmo registro vêm acentuados:

| campo | valor |
| --- | --- |
| `titulo` | PCDT Doenca Pulmonar Obstrutiva **Cronica** |
| `subtemas[0]` | Doença Pulmonar Obstrutiva **Crônica** (DPOC) |

Mesmas palavras, mesmo registro, mesmo arquivo — uma acentuada e outra não. Dos
31 subtemas distintos, 16 têm acento. O JSON, o banco e o gerador preservam
acentuação sem problema.

## Onde a acentuação se perde

**Na autoria da proposta.** `scripts/curate_clinical_updates.py` tem um
`_sem_acento()`, mas ele serve só para **buscar** nós de conhecimento
(`buscar_nos`) — para que a proposta cite o rótulo exato. Ele nunca toca em
`titulo` nem em `resumo_pt`.

A diferença entre os dois campos explica tudo:

- `subtemas` vem do **grafo de conhecimento**, que é acentuado;
- `titulo` e `resumo_pt` vêm do **JSON de proposta**, digitado à mão.

Ou seja: as 42 foram escritas sem acento e ingeridas literalmente.

## A correção, em duas partes

**1. Os 42 registros existentes.** `titulo` e `resumo_pt` em `clinical_update`.
É edição de dado no banco — não há arquivo no repositório para corrigir. Vale
fazer pelo mesmo caminho auditado das outras mudanças destrutivas, e não por
migration numerada: a memória `kbank-migrations-are-not-for-destructive-change`
registra que migration numerada é só aditiva.

**2. Um portão para a próxima.** `curate_clinical_updates.py` já valida campos
obrigatórios (linha ~175: `slug`, `titulo`, `classe`, `nivel`, `data_vigencia`,
`nos`). O mesmo lugar deve recusar proposta cujo texto em português venha sem
acentuação — senão a correção de hoje é desfeita pela próxima proposta.

Uma heurística barata e sem falso positivo perigoso: se o texto contém uma
palavra da lista de termos que **sempre** levam acento em português médico
(`cronica`, `cancer`, `utero`, `criancas`, `deteccao`, `prevencao`, `avaliacao`,
`infeccao`, `diagnostico`, `clinico`, `hepatico`, `cardiaco`, `sindrome`,
`analise`, `obito`, `orgao`, `antibiotico`) e **nenhum** caractere acentuado, a
proposta volta para a mesa.

⚠️ O guard tem de reprovar por **par** (termo sem acento + ausência total de
acento no texto), não por termo isolado: "PCDT" e siglas não têm acento e são
legítimos, e um título curto pode não ter nenhuma palavra acentuável.

## Por que isto não foi pego antes

`check-mojibake.mjs` procura **corrupção** de encoding (`lê` → `lÃª`), e aqui não
há corrupção: o texto é ASCII válido. `check-portuguese-ui-copy.mjs` valida a
copy da interface, não dado vindo do banco. Nenhum guard cobre "texto em
português que perdeu a acentuação na origem" — e é essa a lacuna.
