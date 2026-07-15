import fs from "node:fs";
import path from "node:path";

const roots = [
  "src/app/hoje",
  "src/app/banco-de-questoes",
  "src/app/revisar",
  "src/app/estatisticas",
  "src/app/desempenho",
  "src/components/student",
];

const forbidden = [
  [/quest(?:ões|oes) feitas/giu, 'use "questões respondidas"'],
  [/quest(?:ões|oes) vistas/giu, 'use "questões respondidas"'],
  [/flashcards vencidos/giu, 'use "cards no ponto" or "cards atrasados"'],
  [/acerto que vira dom(?:ínio|inio)/giu, "do not infer mastery from one answer"],
  [/confirmou dom(?:ínio|inio)/giu, "use observed performance for a single session"],
];

function filesUnder(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return filesUnder(target);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [target] : [];
  });
}

const failures = [];
for (const file of roots.flatMap(filesUnder)) {
  const source = fs.readFileSync(file, "utf8");
  for (const [pattern, guidance] of forbidden) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${file}: ${guidance}`);
  }
}

if (failures.length) {
  console.error(`Student vocabulary violations:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Student vocabulary contract: OK");
