# Fácies — frontend

Next.js (App Router). Landing pública, a previsão registrada de cada prova, a
revisão final e o app do aluno.

## Por que este repositório é separado, e público

O frontend vivia dentro do monorepo privado do backend. Medido em 06/09/2026: a
conta gastava **~6.877 min/mês** de GitHub Actions contra uma cota de 2.000
(plano Free) / 3.000 (Pro) — e os minutos são da **conta**, não do repositório,
então os dois repos privados dividiam o mesmo balde. A cota estourou às 18:05 de
05/09 e todo job passou a morrer em 3 segundos, sem passo nenhum.

Actions é gratuito e ilimitado em repositório público. O frontend era o maior
consumidor e não tinha razão para ser privado: **o código já é servido ao
navegador**. Separá-lo devolve os minutos ao backend, que é onde o sigilo
importa.

O histórico foi auditado antes de publicar — 901 caminhos e 3.700 blobs de texto
varridos atrás de DSN com credencial, chave de nuvem, token e chave privada.
Zero ocorrências.

## Os dados vêm prontos

`src/data/facies/*.json` são artefatos **gerados** pelo motor de previsão, que
vive noutro repositório. Esta camada só lê. Não recalcule nada aqui: a previsão
publicada é uma aposta registrada com data e `sha256`, e recalcular na hora de
renderizar quebraria a única coisa que dá valor ao registro.

| arquivo | o que carrega |
| --- | --- |
| `previsao.json` | a aposta registrada: os assuntos, na ordem, com hash |
| `cobertura.json` | quanto a lista cobre da prova, medido fora de amostra |
| `historico.json` | em quantas provas anteriores cada assunto apareceu |
| `revisao_final.json` | os dias da revisão, as questões e as páginas |
| `forma.json`, `facies.json`, `provas.json` | a forma da prova e o acervo por banca |

⚠️ Os que descrevem a lista carregam o `previsao_sha256` dela. Se a previsão for
reexportada e eles não, a camada de leitura devolve `null` e o bloco **some** em
vez de descrever outra lista. Testes em `tests/unit/` transformam esse silêncio
em falha de build.

## Rodar

```bash
npm ci
npm run dev          # desenvolvimento
npm run lint         # eslint + dez verificadores de conteúdo
npm run typecheck
npm run test:unit
npm run check:tamanho  # catraca: módulo grande só pode encolher
npm run build
```

## O contrato com o backend

Três arquivos de teste comparam este frontend com o backend — a allowlist de
eventos, os modos do domínio e o documento de posicionamento. Eles **pulam** com
motivo na tela quando o backend não está por perto, e rodam de verdade quando
está:

```bash
FACIES_BACKEND_DIR=/caminho/para/krosmed npm run test:unit
```

⚠️ Pular não é verificar. A CI do repositório do backend roda esses mesmos testes
apontando para cá, e **reprova se algum pular** — senão passaria verde sem
verificar nada.
