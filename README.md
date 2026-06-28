# COLETA DE DADOS

Aplicação web estática em HTML, CSS e JavaScript puro para coletar medidas antropométricas em uma rodada com duas repetições, calcular ETM ao final e exportar os dados em Excel.

## Objetivo

A ferramenta organiza uma coleta simples e progressiva:

- Identificação da rodada.
- Medida 1.
- Medida 2.
- ETM final por variável.
- Cálculo automático do perímetro muscular do braço por Lohman e por ISAK.
- Exportação `.xlsx` dos dados coletados.

Nem todas as variáveis precisam ser preenchidas para avançar. O cálculo é feito apenas para os pares com medida 1 e medida 2.

## Variáveis

Perímetros em centímetros:

- Perímetro de braço - Lohman.
- Perímetro de braço - ISAK.
- Perímetro da cintura.
- Perímetro abdominal.
- Perímetro do quadril.
- Perímetro da panturrilha.

Dobras cutâneas em milímetros:

- Dobra cutânea tricipital - Lohman.
- Dobra cutânea tricipital - ISAK.

## Fórmulas

ETM para uma rodada com duas repetições:

```text
d = Medida 1 - Medida 2
ETM = sqrt(d² / 2)
Média = (Medida 1 + Medida 2) / 2
ETM% = (ETM / Média) × 100
```

Perímetro muscular do braço:

```text
PMB Lohman = Perímetro de braço Lohman - π × (Dobra tricipital Lohman / 10)
PMB ISAK = Perímetro de braço ISAK - π × (Dobra tricipital ISAK / 10)
```

A dobra cutânea é dividida por 10 para converter milímetros em centímetros.

## Finalização

Os limites padrão são:

- Perímetros: ETM% até 1,0%.
- Dobras cutâneas: ETM% até 5,0%.

Se algum ETM ficar fora do alvo, a pessoa precisa marcar a caixa `Finalizar a avaliação mesmo com ETM fora de alvo` para salvar.

## Executar localmente

Abra `index.html` no navegador ou rode um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Hospedar no GitHub Pages

1. Acesse `Settings`.
2. Entre em `Pages`.
3. Em `Source`, selecione `Deploy from branch`.
4. Selecione a branch `main`.
5. Selecione a pasta `/root`.
