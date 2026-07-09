# Atlas AI Assistant

Chatbot em Node/Express com frontend simples em HTML, CSS e JavaScript.

## Fluxo principal

O frontend envia mensagens para `/api/chat`. O backend valida a entrada, detecta a intencao e responde diretamente ou consulta uma API externa.

Intencoes suportadas:

- `date_time`: data e hora no fuso `Europe/Lisbon`
- `weather`: clima em tempo real via Open-Meteo, sem chave de API
- `football`: jogos via football-data.org
- `general`: resposta pela camada central `services/ai.js`

## Estrutura

```text
services/
  ai.js
  gemini.js
  openai.js
  news.js
  weather.js
  currency.js
  pdf.js
  tts.js
```

O ficheiro `services/ai.js` centraliza o motor principal de IA. Assim, rotas como chat e PDF podem usar a mesma camada sem depender diretamente de Gemini ou OpenAI.

## Memoria de conversa

O Atlas guarda conversas no backend em `data/conversations.json`. O navegador recebe um `conversationId` e reutiliza esse identificador para recuperar o historico quando a pagina abre novamente.

As ultimas mensagens da conversa entram no contexto do modelo, permitindo respostas com memoria recente.

O ficheiro `data/*.json` fica no `.gitignore`, porque pode conter mensagens pessoais.

## Variaveis de ambiente

Crie um ficheiro `.env` baseado no `.env.example`:

```env
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-2.5-flash
FOOTBALL_API_KEY=sua_chave_futebol
CORS_ORIGIN=
PORT=3005
```

Use `CORS_ORIGIN` em producao para limitar os dominios permitidos. Pode deixar vazio em desenvolvimento local.

## Como executar

```bash
npm install
npm start
```

Depois abra:

```text
http://localhost:3005
```

No PowerShell do Windows, se `npm` for bloqueado por politica de execucao, use:

```bash
npm.cmd start
```

## Verificacao

```bash
npm.cmd run check
```

Esse comando executa `node --check` nos arquivos principais do backend e frontend.
