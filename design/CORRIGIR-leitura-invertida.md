# A `leitura` gerada afirma o contrário do que mediu

**Achado durante o desenho da landing v8. APLICADO na árvore de trabalho do
kbank em 02/09/2026 — e deliberadamente NÃO commitado.**

> `scripts/build_facies_dataset.py` já tem alteração sua não commitada. Commitar
> o arquivo inteiro varreria esse trabalho para dentro do meu commit, que é o
> modo de falha que este repositório já viveu uma vez. O patch está aplicado e
> validado (AST + ruff + as quatro bancas conferidas); **commitá-lo é sua**, junto
> com o resto do que você tem ali.

## O que acontece

`kbank/scripts/build_facies_dataset.py`, linha ~786:

```python
elif codigo == "pede_incorreta":
    frases.append(
        f"{pct:.0f}% das questões **pedem a alternativa incorreta**, contra "
        f"{media:.0f}% da média nacional: ler o comando tem retorno real aqui."
    )
```

A oração final — *"ler o comando tem retorno real aqui"* — é **incondicional**.
Ela é colada tanto na banca que usa a pegadinha mais que o país quanto na que
usa muito menos.

Medido em `web/src/data/facies/facies.json`:

| | bancas |
| --- | --- |
| com a frase (`exibivel` em `pede_incorreta`) | **82** |
| usam MAIS que o país (`desvio > 0`) | 29 |
| usam MENOS (`desvio < 0`) | **53** |

Nas 53, a conclusão está **invertida**. Exemplos reais, lado a lado:

| banca | pct | conclusão publicada |
| --- | --- | --- |
| UEPI | 18,3% (2,5× o país) | "ler o comando tem retorno real aqui" |
| USP-RP | 0,5% (14× menos) | "ler o comando tem retorno real aqui" |

O docstring da própria função diz: *"Só entra afirmação que o dado sustenta"*.
Esta não sustenta em 53 de 82.

## Por que importa mais do que parece

A frase não é decorativa: é a única linha da página de banca que diz **o que
fazer com a medida**. Um candidato da USP-RP lê que treinar leitura de comando
"tem retorno real" numa prova que praticamente não usa o recurso — e gasta a
última semana no lugar errado. É o oposto exato do que o produto promete.

## A correção

A direção já está no mesmo dicionário: `item["desvio"]`, cujo sinal concorda com
`pct > media` em **100%** das 82 bancas (conferido). Não é preciso dado novo nem
tocar na consulta.

```diff
         elif codigo == "pede_incorreta":
+            # A conclusão TEM de seguir a direção. Escrita sem condição, ela
+            # afirmava "ler o comando tem retorno real aqui" tanto para quem usa
+            # a pegadinha 2,5x MAIS que o país quanto para quem usa 14x MENOS —
+            # e saía invertida em 53 das 82 bancas que exibem esta medida.
+            #
+            # O sinal de `desvio` é a direção, e vem no mesmo item: conferido,
+            # ele concorda com `pct > media` em todas as 82.
+            fecho = (
+                "ler o comando com atenção rende mais aqui do que na média"
+                if item["desvio"] > 0
+                else "treinar leitura de comando rende menos aqui do que na média"
+            )
             frases.append(
                 f"{pct:.0f}% das questões **pedem a alternativa incorreta**, contra "
-                f"{media:.0f}% da média nacional: ler o comando tem retorno real aqui."
+                f"{media:.0f}% da média nacional: {fecho}."
             )
```

## Depois de aplicar

1. Regerar o dataset e conferir que as duas conclusões aparecem:

   ```
   node -e "const f=require('./web/src/data/facies/facies.json');
     const l=Object.values(f.bancas).flatMap(b=>b.leitura||[]).filter(s=>/incorreta/.test(s));
     const mais=l.filter(s=>/rende mais/.test(s)).length;
     const menos=l.filter(s=>/rende menos/.test(s)).length;
     console.log('mais:',mais,'menos:',menos,'total:',l.length);"
   ```

   Esperado: ~29 / ~53. Se um dos dois vier zero, a condição não pegou.

2. Vale um teste em `kbank/tests/` fixando a invariante: **nenhuma frase de
   `pede_incorreta` pode concluir "rende mais" com `desvio < 0`.** É a checagem
   que faltava, e é ela que impede a regressão.

## As outras duas orações do mesmo bloco

Conferir junto, porque têm a mesma forma:

- `certo_errado`: *"Treinar múltipla escolha aqui prepara mal."* — só é emitida
  quando a banca usa certo/errado de forma exibível, e o sentido é sempre
  "usa mais". Provavelmente correta, mas não verificada.
- o `else` genérico não conclui nada, então não tem o defeito.
