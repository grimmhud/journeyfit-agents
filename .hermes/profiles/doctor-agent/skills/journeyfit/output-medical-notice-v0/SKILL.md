---
name: journeyfit-output-medical-notice-v0
description: Define o campo v0_notice que o agente Medico deve incluir no JSON quando estiver avaliando um caso para um plano JourneyFit. Use somente quando o medico esta respondendo ao orquestrador com avaliacao clinica — nao para perguntas ou conversas.
version: 1.0.0
author: JourneyFit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [journeyfit, schema, output, medical, notice, v0]
    category: journeyfit
---

# JourneyFit — Output: Medical Notice v0

## Quando usar

Apenas quando o agente Medico esta respondendo com uma **avaliacao clinica para um plano**. Inclua `v0_notice` no JSON de resposta ao orquestrador.

Nao use para:
- Perguntas de triagem ou intake sem plano gerado ainda
- Respostas conversacionais diretas ao usuario

## Campo obrigatorio: v0_notice

Sempre inclua no JSON de resposta, mesmo quando o risco for baixo.

```json
{
  "v0_notice": {
    "agent": "doctor",
    "type": "warning | info | restriction",
    "severity": "high | moderate | low",
    "message": "frase unica, clara e nao alarmista para mostrar ao usuario no app"
  }
}
```

## Regras de preenchimento

| Situacao | type | severity |
|---|---|---|
| Baixo risco, sem restricoes relevantes | `info` | `low` |
| Triagem incompleta ou restricoes moderadas | `warning` | `moderate` |
| Red flags presentes ou risco alto | `warning` | `high` |
| Caso urgente, avaliacao presencial necessaria | `restriction` | `high` |

- `message` deve ser uma **unica frase** legivel no app — sem bullets, sem lista, sem markdown
- Nao repita o label "Medico:" dentro da mensagem
- Nao use linguagem alarmista quando nao houver urgencia
- Foque no aviso mais relevante no momento — nao tente resumir tudo

## Exemplos de message

**info/low:** "Sem sinais de alerta com os dados informados; siga o plano e avise se surgirem sintomas."

**warning/moderate:** "Triagem clinica incompleta — confirme historico cardiovascular e medicacoes antes de progredir intensidade."

**warning/high:** "Ha restricoes clinicas que exigem adaptacao do treino; o personal trainer ja recebeu as instrucoes necessarias."

**restriction/high:** "Avaliacao presencial recomendada antes de iniciar qualquer exercicio intenso."
