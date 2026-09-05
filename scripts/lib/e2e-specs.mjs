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
  "auth.proxy-cookie.spec.ts",
  "cadastro.funil.spec.ts",
  "study-import.smoke.spec.ts",
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

