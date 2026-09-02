/**
 * Verifica a landing v8 contra o dataset que a originou.
 *
 *     node design/verificar-landing-v8.mjs
 *
 * ## Por que este arquivo existe
 *
 * A peça é um HTML autocontido: cada número dela foi copiado do dataset uma vez
 * e ali congelou. `facies.json` é regerado com frequência — ele traz `gerado_em`
 * no cabeçalho — e quando muda, a página não reclama. Ela só passa a mentir.
 *
 * Essa foi a falha real desta rodada de design, e duas vezes:
 *
 *   1. A página afirmava "nenhuma das 100 questões pede a alternativa incorreta"
 *      ao lado de um método que dizia `n = 1.763`. A afirmação era verdadeira e
 *      media 5,7% da série — fina demais, e por isso soava falsa. A base certa
 *      para formato eram as 557 questões classificadas da família ENARE/ENAMED.
 *   2. Números de MAQUETE da v7 ("48 palavras por enunciado", "81% do top-30")
 *      não têm campo correspondente em lugar nenhum do dataset, e já haviam
 *      circulado como se fossem medição.
 *
 * Nenhum guard desta base lê o conteúdo de uma peça de design contra a fonte
 * dela. Este lê.
 *
 * ## O que ele NÃO faz
 *
 * Não substitui `verificar:design`, que compara PIXEL contra o desenho. Este
 * compara AFIRMAÇÃO contra dado. E não valida nada fora da peça — a `leitura`
 * gerada em `facies.json`, por exemplo, tem um defeito conhecido (a conclusão
 * não é sensível à direção) que é problema do gerador, não desta página.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(AQUI, 'facies-landing-v8.html');
const DADOS = path.join(AQUI, '..', 'src', 'data', 'facies');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(DADOS, f), 'utf8'));

const falhas = [];
const ok = (m) => console.log('  ok    ' + m);
const bad = (m) => { console.log('  FALHA ' + m); falhas.push(m); };

const bruto = fs.readFileSync(HTML, 'utf8');

// O <style> e o <script> saem ANTES das tags. Sem isso, uma string que existe só
// numa regra CSS passa como se estivesse escrita na página — aconteceu: a
// asserção de "não publicada" ficou verde casando com o `content:` de uma regra
// que já tinha ficado órfã.
const texto = bruto
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ');

const afirma = (s, fonte) => (texto.includes(s)
  ? ok('"' + s + '" — ' + fonte)
  : bad('AUSENTE na página: "' + s + '" (' + fonte + ')'));

const provas = rd('provas.json');
const prova = (provas.provas || Object.values(provas))[0];
const fj = rd('facies.json');
const forma = rd('forma.json');
const prev = rd('previsao.json');
const rev = rd('revisao_final.json');
const atu = rd('atualizacoes.json');

console.log('dataset gerado em ' + String(fj.gerado_em || '?').slice(0, 10)
  + ' · peça com ' + (fs.statSync(HTML).size / 1024).toFixed(1) + ' KB');

const fam = Object.values(fj.bancas)
  .find((b) => /EBSERH-ENARE-E-EXAME-NACIONAL/i.test(b.institution_key));
if (!fam) throw new Error('família ENARE/ENAMED não encontrada em facies.json');

console.log('\n== formato: a base é a da família, não a da edição direta ==');
{
  const dist = fam.formato.distribuicao;
  const base = dist.reduce((s, d) => s + d.qtd, 0);
  const inc = dist.find((d) => d.codigo === 'pede_incorreta');
  base === 557 ? ok('base de formato = ' + base)
    : bad('base virou ' + base + ' e a página ainda diz 557');
  afirma('557', 'soma das qtd da distribuição de formato');
  afirma(String(inc.qtd), 'pede_incorreta.qtd');
  !texto.includes('nenhuma das 100 questões pede a alternativa incorreta')
    ? ok('a afirmação de formato sobre n=100 continua fora')
    : bad('voltou a afirmar formato sobre as 100 da edição direta');
}

console.log('\n== observado x esperado (padronização indireta, migration 129) ==');
{
  const pad = fam.padronizada;
  const a = fam.assinatura.find((x) => x.medida === 'pede_incorreta');
  const pi = pad.linhas.find((l) => l.medida === 'pede_incorreta');
  const vl = pad.linhas.find((l) => l.medida === 'vinheta_longa');
  pad.estrato === 'tema'
    ? ok('esperado ajustado por TEMA — não confunde a forma com a matéria')
    : bad('estrato virou ' + pad.estrato);
  afirma(String(a.pct_esperado).replace('.', ',') + '%',
    'pct_esperado (= ' + pi.esperado + ' de ' + pad.base + ')');
  afirma(String(a.pct_estrato).replace('.', ',') + '%',
    'pct_estrato (= ' + pi.observado + ' de ' + pad.base + ')');
  afirma(String(a.pct_recente).replace('.', ',') + '%',
    'pct_recente (base ' + a.base_recente + ')');
  (pi.razao > 0.45 && pi.razao < 0.55)
    ? ok('"metade" é verdade para razão ' + pi.razao.toFixed(2))
    : bad('razão ' + pi.razao + ' já não é "metade", e a página afirma que é');
  pi.ic_alto < 1
    ? ok('a publicada tem IC [' + pi.ic_baixo + ', ' + pi.ic_alto + '] que NÃO cruza 1')
    : bad('o IC da publicada passou a cruzar 1 — a afirmação perdeu o lastro');
  (vl.ic_baixo < 1 && vl.ic_alto > 1 && vl.exibivel === false)
    ? ok('a não publicada segue com IC que cruza 1 (exibivel:false)')
    : bad('vinheta_longa mudou de estado: ' + JSON.stringify(vl));
  afirma(String(Math.round(vl.observado)), 'vinheta_longa.observado');
  afirma(String(Math.round(vl.esperado)), 'vinheta_longa.esperado, arredondado na página');
  afirma('Não publicamos', 'a limitação declarada — e não uma regra de CSS');
}

console.log('\n== a referência nacional ==');
{
  afirma(fj.nacional.total.toLocaleString('pt-BR'), 'nacional.total');
  const nb = Object.keys(fj.bancas).length;
  afirma(String(nb), 'bancas no dataset');
  // A invariante da migration 129 ("razão global = 1,0000") vale sobre as 267
  // bancas do ACERVO. Aqui são só as publicáveis, um subconjunto filtrado —
  // então ela não fecha, e isso é esperado. Fica impresso para ninguém tentar
  // conferi-la por este arquivo e concluir que o esperado está quebrado.
  const g = Object.values(fj.bancas).reduce((acc, b) => {
    const l = b.padronizada && b.padronizada.linhas.find((x) => x.medida === 'pede_incorreta');
    return l ? { o: acc.o + l.observado, e: acc.e + l.esperado } : acc;
  }, { o: 0, e: 0 });
  console.log('        razão global nas ' + nb + ' publicáveis: ' + (g.o / g.e).toFixed(4)
    + ' — a invariante 1,0000 da 129 vale sobre as 267 do acervo, não aqui');
}

console.log('\n== área, série e método ==');
{
  const cm = prova.areas.linhas.find((l) => l.rotulo === 'Clínica Médica');
  cm.pct > 33.34
    ? ok('"mais de um terço" é verdade para clínica médica (' + cm.pct + '%)')
    : bad('CM caiu para ' + cm.pct + '% — "mais de um terço" deixou de ser verdade');
  afirma(String(cm.qtd), 'contagem de clínica médica na grade');
  const soma = prova.areas.linhas.reduce((s, l) => s + l.qtd, 0);
  soma === 100 ? ok('as 7 áreas somam 100 questões') : bad('as áreas somam ' + soma);
  afirma(prova.profundidade.questoes_rotuladas.toLocaleString('pt-BR'), 'questões rotuladas');
  afirma(String(prova.profundidade.aplicacoes_na_serie), 'aplicações na série');
  afirma(String(forma.metodo.erro_medido_pp).replace('.', ',') + ' pp',
    'forma.json → erro fora de amostra');
}

console.log('\n== a aposta registrada ==');
{
  const lista = prev.predictions.subtheme.lista;
  lista.length === 30 ? ok('30 assuntos') : bad('a lista tem ' + lista.length);
  afirma(prev.content_sha256.slice(0, 8), 'previsao.json → content_sha256');
  const d = prev.registered_at.slice(0, 10).split('-');
  afirma(d[2] + '.' + d[1] + '.' + d[0], 'registered_at');
  const fora = lista.filter((p) => !texto.includes(p.rotulo));
  fora.length === 0 ? ok('os 30 rótulos estão na página')
    : bad('faltam na página: ' + fora.map((p) => p.rotulo).join(', '));
  const dez = lista.slice(0, 10)
    .filter((p) => !texto.includes(String(p.score).replace('.', ',')));
  dez.length === 0 ? ok('os dez primeiros trazem o score')
    : bad('score ausente em: ' + dez.map((p) => p.rotulo).join(', '));
}

console.log('\n== a série por assunto ==');
{
  const anos = prova.mais_cai.anos_correlatos.length + prova.mais_cai.anos_diretos.length;
  const barras = (bruto.match(/<i class="[cd]"/g) || []).length;
  barras === anos * 10
    ? ok(barras + ' barras = ' + anos + ' aplicações × 10 assuntos')
    : bad(barras + ' barras, esperava ' + anos * 10);
  const diretas = (bruto.match(/<i class="d"/g) || []).length;
  diretas === prova.mais_cai.anos_diretos.length * 10
    ? ok(diretas + ' barras em petróleo = as edições próprias')
    : bad(diretas + ' barras diretas');
}

console.log('\n== a revisão e as atualizações clínicas ==');
{
  afirma(String(rev.estrutura.total_questoes), 'revisao_final → total de questões');
  afirma(String(rev.estrutura.carga_por_dia.length), 'dias da revisão');
  afirma(String(rev.atualizacoes.length), 'atualizações no ebook');
  afirma(String(rev.estrutura.dias_livres_ate_prova), 'dias livres antes da prova');
  afirma(rev.honestidade.nota_previsao.slice(0, 60), 'a nota de honestidade, verbatim');
  atu.metodo.entra_no_score === false
    ? (texto.includes('não entram no score')
      ? ok('entra_no_score:false, e a página declara isso')
      : bad('as atualizações não entram no score e a página não diz'))
    : bad('atualizacoes.metodo.entra_no_score virou ' + atu.metodo.entra_no_score);
  for (const t of ['Vacina hexavalente', 'Testagem molecular', 'Vacina dengue']) {
    const u = rev.atualizacoes.find((x) => x.titulo.startsWith(t));
    u ? ok('"' + u.titulo.slice(0, 42) + '…" existe, vigência ' + u.vigencia)
      : bad('a página cita uma atualização que saiu do dataset: ' + t);
  }
}

console.log('\n== o porte carregou a copy aprovada? ==');
{
  // A copy desta peça passou por várias rodadas de decisão do dono — quatro só
  // na manchete. O porte em `src/app/_rascunho-v8/` pode perder uma frase
  // aprovada numa refatoração e nada reclama: typecheck não lê português.
  //
  // Só roda se o porte existir. Quando ele for promovido, trocar o diretório.
  const dir = path.join(AQUI, '..', 'src', 'app', '_rascunho-v8');
  if (!fs.existsSync(dir)) {
    console.log('        (porte ausente — seção pulada)');
  } else {
    const porte = fs.readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' '))
      .join(' ')
      .replace(/\s+/g, ' ');

    const APROVADAS = [
      ['manchete', 'Cada prova tem uma'],
      ['abertura', 'não vai achar isso no edital'],
      ['h2 medidas', 'A prova não cobra só o que você sabe'],
      ['h2 trinta', 'Todo mundo diz o que vai cair. Depois.'],
      ['trinta: a virada', 'Nós dissemos antes'],
      ['h2 cursinho', 'Cursinho também prevê prova. A diferença é a conta.'],
      ['h2 mapa', 'O que você ainda não viu'],
      ['h2 objeções', 'Perguntas que você faria'],
      ['objeções: quem', 'não é braço de cursinho'],
      ['fecho: a decisão', 'ninguém aprende matéria nova'],
      ['fecho: e-mail', 'Ninguém mostra a conta'],
      ['mapa: preço', 'preço estará escrito aqui antes de qualquer cobrança'],
    ];
    const perdidas = APROVADAS.filter(([, f]) => texto.includes(f) && !porte.includes(f));
    perdidas.length === 0
      ? ok('as ' + APROVADAS.length + ' frases aprovadas estão nos dois')
      : perdidas.forEach(([onde, f]) => bad('o porte perdeu ' + onde + ': "' + f + '"'));

    // ⚠️ Medição, não veredito: o NOME do produto sai das superfícies de maior
    // atenção quando manchete e botão usam a palavra do corredor. Foi decisão do
    // dono; fica visível para ser revisitada de olhos abertos.
    const nome = (porte.match(/fácies/gi) || []).length;
    const vern = (porte.match(/\bcara\b/gi) || []).length;
    console.log('        no porte: "fácies" ' + nome + 'x · "cara" ' + vern
      + 'x — manchete e botão não vêm daqui (CabecalhoPublico e BuscaDeProva)');

    // ═══ O TRIAL: o número tem de bater com o backend ═══════════════════════
    //
    // `DIAS_DE_TRIAL` mora em `app/repos/entitlement_repo.py` e é constante de
    // OUTRO runtime — não dá para importar. A landing repete o número, então
    // este laço lê o Python e reprova se divergirem.
    //
    // Não é zelo abstrato: `web/src/lib/accessLapse.ts` diz "trial de 14 dias"
    // enquanto o backend concede 30. Número em comentário é afirmação com prazo
    // de validade, e o repositório já documenta isso uma vez.
    const py = path.join(AQUI, '..', '..', 'app', 'repos', 'entitlement_repo.py');
    if (fs.existsSync(py)) {
      const m = fs.readFileSync(py, 'utf8').match(/DIAS_DE_TRIAL\s*=\s*(\d+)/);
      const naLanding = porte.match(/DIAS_DE_TRIAL\s*=\s*(\d+)/);
      if (m && naLanding) {
        m[1] === naLanding[1]
          ? ok('o trial da landing (' + naLanding[1] + ' dias) bate com entitlement_repo.py')
          : bad('a landing diz ' + naLanding[1] + ' dias de trial e o backend concede ' + m[1]);
      } else {
        bad('não consegui ler DIAS_DE_TRIAL nos dois lados — o laço quebrou');
      }
    } else {
      console.log('        (entitlement_repo.py fora de alcance — checagem do trial pulada)');
    }

    // O cartão do link: a descrição é cortada perto de 160 caracteres na busca e
    // em ~2 linhas no WhatsApp. A primeira versão tinha 234, e o que caía fora
    // era "Grátis, sem cadastro" — justamente o removedor de atrito. O teto não
    // é estético: é o que decide se a frase que tira o medo chega ao leitor.
    porte.includes('assuntos registrados antes da prova. Grátis, sem cadastro.')
      ? ok('a descrição termina no removedor de atrito, que é o que precisa sobreviver ao corte')
      : bad('a descrição do cartão mudou de fecho — conferir se "Grátis, sem cadastro" ainda cabe em 160');
    porte.includes('O peso de cada área, as nove medidas e os')
      ? bad('a descrição voltou à versão longa (234 car.): será cortada antes do "Grátis"')
      : ok('a descrição não voltou à versão que estourava o corte');
  }
}

console.log('\n== nenhuma afirmação de maquete voltou ==');
{
  // As regiões de DEMONSTRAÇÃO saem da varredura: a questão sintética e o mapa
  // de exemplo carregam números próprios — as 48 palavras DAQUELE enunciado, os
  // 81% de acerto do aluno fictício — que a tela rotula como demonstração e que
  // não afirmam nada sobre o ENAMED.
  const semDemo = bruto
    .replace(/<div class="demo"[\s\S]*?<\/dl>/, ' ')
    .replace(/<div class="mapa"[\s\S]*?<\/p>\s*<\/div>/, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const MAQUETE = [
    ['48 palavras por enunciado', 'medida de forma sem campo no dataset'],
    ['81% do top-30', 'validação inventada; o medido é 35 de 100'],
    ['820 questões', 'base da maquete; a real é 1.763'],
    ['4,32', 'lift invalidado por errata versionada'],
    ['1,2 negativas', 'medida sem fonte'],
    ['5% trazem imagem', 'medida sem fonte'],
    ['19% pedem', 'formato inventado; o medido é 3,8%'],
    ['preventiva 22', 'distribuição invertida da v7'],
  ];
  const orfaos = MAQUETE.filter(([s]) => semDemo.includes(s.toLowerCase()));
  orfaos.length === 0
    ? ok('nenhuma das ' + MAQUETE.length + ' (demonstrações excluídas da varredura)')
    : orfaos.forEach(([s, m]) => bad('maquete de volta: "' + s + '" — ' + m));
}

// ---------------------------------------------------------------------------
// O CARTAO DO LINK, QUE AGORA ESTA EM PRODUCAO
//
// src/app/opengraph-image.png e o PNG que o WhatsApp mostra quando alguem
// repassa facies.app, e o .alt.txt ao lado dele e texto CONGELADO que faz uma
// afirmacao quantitativa. Como o PNG tambem esta congelado, os dois nunca
// divergem UM DO OUTRO; o que pode divergir e o par contra o dataset, no dia em
// que a maior area deixar de passar de um terco.
//
// Sem isto o cartao seria a unica superficie da pagina sem lastro conferido, e
// e justamente a que mais gente ve, porque circula sem que ninguem abra o site.
console.log('\n== o cartao do link (og:image) ==');
{
  const dirApp = path.join(AQUI, '..', 'src', 'app');
  const png = path.join(dirApp, 'opengraph-image.png');
  const arqAlt = path.join(dirApp, 'opengraph-image.alt.txt');

  fs.existsSync(png)
    ? ok('o PNG esta em src/app/; a convencao do App Router o injeta sozinha')
    : bad('src/app/opengraph-image.png sumiu — a home volta a nao ter cartao');

  if (fs.existsSync(arqAlt)) {
    const alt = fs.readFileSync(arqAlt, 'utf8').trim();
    const areas = (prova.areas && prova.areas.linhas) || [];
    const total = areas.reduce((a, x) => a + (x.qtd || 0), 0);
    const maior = areas.reduce((a, x) => ((x.qtd || 0) > (a.qtd || 0) ? x : a), areas[0] || {});
    const frac = total ? maior.qtd / total : 0;
    const nome = maior.rotulo || maior.nome || maior.area || '?';

    if (!/mais de um ter/i.test(alt)) {
      ok('o alt nao faz a afirmacao do terco; nada a amarrar');
    } else if (frac > 1 / 3) {
      ok('"mais de um terco" confere: ' + maior.qtd + '/' + total + ' = '
         + (frac * 100).toFixed(1) + '% em ' + nome);
    } else {
      bad('o alt diz "mais de um terco" e a maior area caiu para '
          + (frac * 100).toFixed(1) + '% — refazer o PNG e o alt');
    }

    alt.length <= 200
      ? ok('o alt cabe no cartao (' + alt.length + ' caracteres)')
      : bad('o alt tem ' + alt.length + ' caracteres; acima de 200 e truncado');
  } else {
    bad('opengraph-image.alt.txt sumiu — o cartao perde a descricao acessivel');
  }
}


console.log('\n' + (falhas.length
  ? '### ' + falhas.length + ' FALHA(S) — a peça divergiu do dataset'
  : '### a peça confere com o dataset'));
process.exit(falhas.length ? 1 : 0);
