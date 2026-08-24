import type { DisplayArea } from "@/lib/areaIdentity";

/**
 * A grande área de cada assunto do acervo — mapa CURADO e provisório.
 *
 * ## Por que existe
 *
 * O `facies.json` não traz área por assunto: a linha é `{rotulo, n, exibivel}`
 * e não há nenhum campo de área, tema ou especialidade. A relação existe no
 * grafo do kbank, mas não viaja no JSON.
 *
 * Minha primeira conclusão foi que colorir o mapa era inviável, e ela estava
 * errada por um erro de medida: contei 2.115 LINHAS (15 assuntos × 141 bancas)
 * quando o que importa é quantos rótulos DISTINTOS existem. São **191**, e 100
 * deles cobrem 92,9% de tudo que chega à tela. Curar 191 é uma tarde; curar
 * 2.115 não seria.
 *
 * ## Isto é interino, e o destino é o gerador
 *
 * O certo é `build_facies_dataset.py` (no kbank) emitir a área junto do assunto,
 * lendo o pai direto do grafo. Enquanto isso não acontece, este arquivo é a
 * ponte — e a checagem em `tests/unit` falha quando a base traz rótulo novo,
 * para a lacuna aparecer no CI em vez de virar célula cinza em silêncio.
 *
 * ## Critério
 *
 * A área é a do CADERNO em que a questão cai numa prova de residência, não a da
 * especialidade que trata a doença. Por isso:
 *
 *   - psiquiatria e neurologia → CM, porque caem no caderno de clínica;
 *   - urologia e ortopedia → CG, porque caem no caderno de cirurgia;
 *   - tudo do SUS, epidemiologia, ética e saúde do trabalhador → MP;
 *   - gestação → OB; fora da gestação → GO. É a divisão que o próprio acervo
 *     usa ao separar as duas áreas.
 *
 * ⚠️ Revisão médica bem-vinda: são 191 julgamentos clínicos e eu não sou a
 * autoridade sobre eles. Erro aqui aparece como célula da cor errada, que é
 * visível — e um arquivo só para corrigir.
 */

export const AREA_DO_ASSUNTO: Record<string, DisplayArea> = {
  // ── Clínica Médica ────────────────────────────────────────────────────
  Diabetes: "CM",
  "Aterosclerose e Doença Arterial Coronariana": "CM",
  "Arritmias Cardíacas": "CM",
  Tireoide: "CM",
  "Hipertensão Arterial Sistêmica (HAS)": "CM",
  "Insuficiência Cardíaca": "CM",
  Glomerulopatias: "CM",
  "Artropatias inflamatórias": "CM",
  "Hemorragia Digestiva (HD)": "CM",
  "Transtornos do Humor": "CM",
  Asma: "CM",
  "Infecções do Sistema Nervoso Central": "CM",
  "Intoxicações Exógenas": "CM",
  "Doenças autoimunes do tecido conjuntivo": "CM",
  "Hepatites Virais": "CM",
  "Tuberculose (TB)": "CM",
  "COVID 19": "CM",
  Psicofarmacologia: "CM",
  "Pneumologia Intensiva": "CM",
  "Doença Renal Crônica": "CM",
  "Complicações da Insuficiência Hepática": "CM",
  Hemostasia: "CM",
  "Acidentes Vasculares Cerebrais (AVC)": "CM",
  "Lesão renal aguda (LRA)": "CM",
  "Metabolismo Ósseo e Mineral": "CM",
  "Doenças Neuromusculares": "CM",
  "Coma e Alterações da Consciência": "CM",
  "Derrame Pleural": "CM",
  "Avaliação Cardiovascular": "CM",
  Adrenal: "CM",
  "Anemias microcíticas": "CM",
  "Anatomia, Fisiologia e Semiologia Neurológica": "CM",
  Hemoglobinopatias: "CM",
  "Anemias hemolíticas": "CM",
  Cefaleias: "CM",
  "Infecções bacterianas": "CM",
  "Transtornos Ansiosos": "CM",
  Epilepsias: "CM",
  Valvopatias: "CM",
  "Pneumopatias Intersticiais, Hipertensão Pulmonar, Bronquiectasias e Pneumotórax Espontâneo":
    "CM",
  "Síndromes febris": "CM",
  Anafilaxia: "CM",
  "Doença Pulmonar Obstrutiva Crônica (DPOC)": "CM",
  Cardiomiopatias: "CM",
  Sepse: "CM",
  "Câncer de Pulmão": "CM",
  "Diagnóstico Nutricional": "CM",
  "Infecção do trato urinário (ITU)": "CM",
  "Infecção de Trato Urinário (ITU)": "CM",
  "Distúrbios do equilíbrio acidobásico (DHE)": "CM",
  "Psicopatologia e Exame do Estado Mental (EEM)": "CM",
  "Tromboembolismo Pulmonar (TEP)": "CM",
  "Trombose Venosa Profunda (TVP)": "CM",
  Hiponatremia: "CM",
  "Transtorno Obsessivo-Compulsivo (TOC)": "CM",
  "Transtorno Psicóticos": "CM",
  Parasitoses: "CM",
  Vitaminas: "CM",
  "Reforma Psiquiátrica e Psiquiatria Social": "CM",
  "Anemias macrocíticas": "CM",
  "Outras Hepatopatias": "CM",
  "Febre Reumática (FR)": "CM",
  "Introdução ao Estudo das Anemias": "CM",
  Pneumonia: "CM",
  "Infecções fúngicas": "CM",
  "Dermatoses infecciosas": "CM",
  "Dermatoses eczematosas": "CM",
  "Câncer de pele": "CM",
  "Saúde do Idoso (geriatria)": "CM",
  "HIV/Aids": "CM",
  Hanseníase: "CM",
  Arboviroses: "CM",
  "Dependência Química": "CM",
  "Infecções das Vias Aéreas Superiores": "CM",
  "Animais peçonhentos": "CM",

  // ── Cirurgia ──────────────────────────────────────────────────────────
  "Neoplasias do Sistema Digestivo": "CG",
  "Abdome Agudo Inflamatório": "CG",
  "Avaliação Inicial: Vias aéreas, Ventilação e Choque": "CG",
  Esôfago: "CG",
  Intestinos: "CG",
  Pâncreas: "CG",
  "Ortopedia Geral": "CG",
  "Trauma Abdominal e Pélvico": "CG",
  "Abdome Agudo Obstrutivo": "CG",
  Estômago: "CG",
  "Trauma Ortopédico": "CG",
  "Tumores Hepáticos": "CG",
  "Neoplasias Malignas de Cabeça e Pescoço": "CG",
  "Traumatismo Craniencefálico": "CG",
  "Traumatismo Cranioencefálico": "CG",
  "Hérnias Inguinocrurais": "CG",
  "Abdome Agudo Perfurativo": "CG",
  "Complicações Locais": "CG",
  "Atendimento Inicial às Vítimas de Queimadura": "CG",
  "Doença Venosa Crônica": "CG",
  "Doenças Orificiais": "CG",
  "Complicações Gastrointestinais": "CG",
  "Afecções do Trato Geniturinário": "CG",
  "Anestésicos Locais": "CG",
  "Doenças da cartilagem e do osso": "CG",
  "Incontinência urinária": "CG",

  // ── Pediatria ─────────────────────────────────────────────────────────
  "Cuidados neonatais": "PD",
  "Pneumonias/Broncopneumonias (BCP) na Infância": "PD",
  "Psiquiatria Infantil": "PD",
  Puberdade: "PD",
  "Diarreia Aguda": "PD",
  "Amamentação/ Aleitamento Materno": "PD",
  "Infecções congênitas": "PD",
  "DNPM (Desenvolvimento Neuro-Psico-Motor)": "PD",
  Crescimento: "PD",
  "Reanimação neonatal": "PD",
  "Distúrbios respiratórios do período neonatal": "PD",
  "Convulsão febril": "PD",
  "Cardiopediatria e Cardiopatias congênitas": "PD",
  "Emergências Pediátricas: Parada Cardiorrespiratória (PCR) e Arritmias na Emergência":
    "PD",
  "Ortopedia Pediátrica": "PD",
  "Icterícia nenonatal e distúrbios hematológicos no RN": "PD",
  "Principais Afecções Cirúrgicas Abdominais Adquiridas do Lactente": "PD",
  "Febre sem sinais localizatórios (FSSL)": "PD",
  Bronquiolite: "PD",
  "Sepse neonatal": "PD",
  "Doença de Kawasaki": "PD",
  "Doenças exantemáticas": "PD",

  // ── Ginecologia ───────────────────────────────────────────────────────
  "Planejamento familiar": "GO",
  "Rastreamento do câncer de colo do útero": "GO",
  Climatério: "GO",
  Vulvovaginites: "GO",
  Amenorreias: "GO",
  "Câncer de mama": "GO",
  "Hiperplasia Endometrial / Câncer de endométrio e outros tumores do corpo do útero":
    "GO",
  Endometriose: "GO",
  "Atendimento à vítima de violência sexual": "GO",
  "Infecções sexualmente transmissíveis": "GO",
  "Sangramento uterino anormal": "GO",
  "Rastreamento do câncer de mama": "GO",
  "Miomatose uterina": "GO",
  "Infertilidade conjugal": "GO",
  "Introdução e doenças benignas da mama": "GO",
  "Tumores anexiais e câncer de ovário": "GO",
  "Prolapsos de órgãos pélvicos": "GO",
  "Síndrome dos ovários policísticos": "GO",
  "Doença Inflamatória Pélvica": "GO",
  "Ciclo menstrual": "GO",
  "Úlceras genitais": "GO",
  "Anatomia  do trato genital feminino": "GO",

  // ── Obstetrícia ───────────────────────────────────────────────────────
  "Síndromes Hipertensivas da Gestação": "OB",
  "Sangramento primeira metade": "OB",
  "Assistência pré-natal": "OB",
  "Diabetes na gestação (DMG)": "OB",
  "Sangramento segunda metade da gestação": "OB",
  "Hemorragias pós parto (HPP) e rotura uterina": "OB",
  "Doenças infecciosas na gestação – HIV, sífilis, hepatites, herpes": "OB",
  "Avaliação da vitalidade fetal": "OB",
  "Modificações fisiológicas da gestação": "OB",
  "Trabalho de parto prematuro (TPP)": "OB",
  "Rotura prematura de membranas ovulares (RPM)": "OB",
  "Infecção Urinária e Bacteriúria Assintomática na gestação (ITU)": "OB",
  "Assistência ao parto normal": "OB",
  "Estática fetal": "OB",
  "Parto vaginal operatório": "OB",
  "Alteração do volume de líquido amniótico (ILA)": "OB",
  "Diagnóstico e datação da gestação": "OB",

  // ── Medicina Preventiva ───────────────────────────────────────────────
  "Vigilância em Saúde": "MP",
  "Imunizações/Vacinação": "MP",
  "Princípios e Diretrizes do Sistema Único de Saúde (SUS)": "MP",
  "Estudos Epidemiológicos": "MP",
  "Processo saúde-doença": "MP",
  "Medidas de saúde coletiva": "MP",
  "Atenção Primária à Saúde (APS) no Brasil": "MP",
  "Testes Diagnósticos": "MP",
  "Principais marcos legais do SUS": "MP",
  "Medidas de Associação e Medidas de Impacto": "MP",
  "Código de Ética Médica (CEM)": "MP",
  "Financiamento em Saúde": "MP",
  "Método Clínico Centrado na Pessoa": "MP",
  "Princípios de Estatística (Bioestatística ou Estatística Médica)": "MP",
  "Políticas de Saúde do Sistema Único de Saúde": "MP",
  "Doenças relacionadas ao trabalho": "MP",
  "Processos de Descentralização e Regionalização do SUS": "MP",
  "História do Sistema Único de Saúde (SUS)": "MP",
  "Bases legais de Saúde do Trabalhador": "MP",
  "Transição Demográfica e Epidemiológica": "MP",
  "Processos Endêmicos e Epidêmico (Endemias e Epidemias)": "MP",
  "Abordagem Familiar": "MP",
  "Acidente de trabalho": "MP",
  Epidemiologia: "MP",
  "Aspectos Epidemiológicos das Doenças Transmissíveis": "MP",
  "Medicina Baseada em Evidências": "MP",
  "Abordagem Comunitária": "MP",
  "Princípios da Medicina de Família e Comunidade": "MP",

  // ── Sem área própria ──────────────────────────────────────────────────
  // "Miscelânea" é o balde do próprio acervo. Forçá-lo numa área seria
  // inventar uma classificação que a base não fez.
  Miscelânea: "OU",
};

/** A área do assunto, ou `null` quando ele ainda não foi curado. */
export function areaDoAssunto(rotulo: string): DisplayArea | null {
  return AREA_DO_ASSUNTO[rotulo] ?? null;
}
