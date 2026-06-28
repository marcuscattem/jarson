# ETM Antropométrico

Aplicação web estática em HTML, CSS e JavaScript puro para avaliar a qualidade de medidas antropométricas e interpretar se mudanças observadas em perímetros corporais e dobras cutâneas são maiores que o erro técnico de medida.

## Objetivo

A ferramenta apoia dois fluxos de análise:

- Controle de repetibilidade de triplicatas individuais.
- Cálculo do ETM clássico do estudo com vários participantes medidos duas vezes.

## Triplicata individual x ETM clássico

O controle de triplicata verifica se duas ou três repetições feitas no mesmo indivíduo estão consistentes. Ele usa média, desvio padrão, coeficiente de variação e amplitude para indicar se a medida deve ser aceita ou repetida.

O ETM clássico estima o erro técnico real de um avaliador, método ou protocolo a partir de vários participantes medidos duas vezes. Ele deve ser preferido para interpretar mudanças longitudinais.

## Fórmulas

Triplicata individual:

```text
Média = (M1 + M2 + M3) / k
DP = sqrt(Σ(xi - média)² / (k - 1))
CV% = (DP / média) × 100
Amplitude = maior valor - menor valor
```

ETM clássico do estudo:

```text
d = Medida 1 - Medida 2
ETM = sqrt(Σd² / 2N)
ETM% = (ETM / média geral) × 100
```

## Interpretação

Na triplicata, a medida é considerada aceitável quando CV% e amplitude ficam dentro dos limites definidos pelo pesquisador.

Para mudanças longitudinais:

- `|Δ| ≤ ETM`: mudança compatível com erro técnico.
- `ETM < |Δ| ≤ 2×ETM`: possível mudança real.
- `|Δ| > 2×ETM`: mudança provavelmente real.

Quando não houver ETM clássico calculado, a ferramenta pode gerar uma interpretação provisória baseada na variabilidade da triplicata, recomendando o cálculo do ETM clássico do estudo.

## Arquivos

```text
index.html
style.css
script.js
README.md
```

## Executar localmente

Abra `index.html` no navegador ou rode um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Hospedar no GitHub Pages

1. Crie um repositório no GitHub.
2. Suba os arquivos `index.html`, `style.css`, `script.js` e `README.md`.
3. Acesse `Settings`.
4. Entre em `Pages`.
5. Em `Source`, selecione `Deploy from branch`.
6. Selecione a branch `main`.
7. Selecione a pasta `/root`.
