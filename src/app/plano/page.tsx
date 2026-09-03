import { PlanoClientPage } from "./PlanoClientPage";

/** Aba `rotina` · filho "O plano ate' a prova" — o artboard `9c`.
 *
 *  Fina de proposito: o plano depende do token do aluno, entao a leitura vive
 *  no cliente. `/cronograma` continua sendo o calendario; esta tela responde
 *  "o que vem pela frente, e cabe na minha semana?". */
export default function PlanoPage() {
  return <PlanoClientPage />;
}
