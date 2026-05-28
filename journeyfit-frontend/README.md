# JourneyFit Frontend

React app independente para renderizar o JSON dos agentes como uma experiência de produto para usuário final.

## Rodar localmente

```bash
cd journeyfit-frontend
npm install
npm run dev
```

### Endpoint do orquestrador

Por padrão o chat envia POST para a API compatível com OpenAI do Hermes:

```text
http://127.0.0.1:8642/v1/chat/completions
```

Para habilitar a API no gateway, configure no ambiente e reinicie:

```bash
# arquivo: <repo>/.hermes/profiles/orchestrator/.env
API_SERVER_ENABLED=true
API_SERVER_PORT=8642
API_SERVER_HOST=127.0.0.1
API_SERVER_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Se quiser proteger com chave:

```bash
# arquivo: <repo>/.hermes/profiles/orchestrator/.env
API_SERVER_KEY=uma-chave-forte
```

E no frontend:

```bash
VITE_JOURNEYFIT_API_KEY=uma-chave-forte
```

Se o backend estiver em outro host ou porta, defina:

```bash
VITE_JOURNEYFIT_API_URL=http://127.0.0.1:8642/v1/chat/completions
```

## O que esse app faz

- recebe JSON como fonte de verdade
- transforma treino, dieta e rotina em uma interface mobile-first
- serve como base para os schemas que vamos endurecer depois
