# 🌟 Calendário Mágico da Geladeira

Um calendário divertido e interativo feito para crianças, otimizado para a tela touch da **Samsung RF29** no formato retrato. Sincroniza com o **Google Calendar**.

---

## 📱 Como fica na geladeira

- Interface colorida com emojis e animações
- Botões grandes e fáceis de tocar
- Scrolling suave sem zoom acidental
- Funciona como um Progressive Web App (PWA)

---

## 🚀 Passo a passo para configurar

### 1. Criar o projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Clique em **"Novo Projeto"** → dê um nome (ex: `calendario-magico`)
3. No menu lateral, vá em **"APIs e Serviços" → "Biblioteca"**
4. Pesquise por **"Google Calendar API"** e clique em **"Ativar"**

### 2. Criar as credenciais

#### API Key
1. Vá em **"APIs e Serviços" → "Credenciais"**
2. Clique em **"+ Criar Credencial" → "Chave de API"**
3. Copie a chave gerada — vamos usá-la em instantes
4. (Recomendado) Clique em **"Restringir chave"** e limite ao domínio do seu GitHub Pages

#### OAuth 2.0 Client ID
1. Em **"Credenciais"**, clique em **"+ Criar Credencial" → "ID do cliente OAuth 2.0"**
2. Tipo de aplicativo: **"Aplicativo da Web"**
3. Nome: `Calendário Mágico`
4. Em **"Origens JavaScript autorizadas"**, adicione:
   - `http://localhost:3000` (para desenvolvimento)
   - `https://SEU_USUARIO.github.io` (para produção)
5. Clique em **Criar** e copie o **Client ID**

### 3. Configurar o app

Abra o arquivo `src/googleConfig.js` e substitua os valores:

```js
const GOOGLE_CONFIG = {
  API_KEY: "COLE_SUA_API_KEY_AQUI",
  CLIENT_ID: "COLE_SEU_CLIENT_ID_AQUI.apps.googleusercontent.com",
  CALENDAR_NAME: "Calendário Mágico da [Nome da sua filha] ⭐",
  TIMEZONE: "America/Sao_Paulo",
  // ...
};
```

### 4. Configurar o GitHub Pages

Abra o arquivo `package.json` e substitua:

```json
"homepage": "https://SEU_USUARIO.github.io/geladeira-calendar"
```

### 5. Publicar no GitHub

```bash
# Instale as dependências
npm install

# Faça login no GitHub CLI (ou use a interface do GitHub)
# Crie um repositório chamado "geladeira-calendar" no GitHub

# Configure o repositório remoto
git init
git add .
git commit -m "🌟 Primeiro commit — Calendário Mágico"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/geladeira-calendar.git
git push -u origin main

# Publique no GitHub Pages
npm run deploy
```

Após o deploy, o app estará disponível em:
`https://SEU_USUARIO.github.io/geladeira-calendar`

---

## 📺 Configurar na geladeira Samsung RF29

1. Na tela da geladeira, abra o **navegador** (Family Hub → Apps → Internet)
2. Digite a URL do GitHub Pages
3. Para facilitar: adicione como favorito ou na tela inicial
4. Recomendado: acesse as **Configurações do navegador** e desative o zoom (ou defina zoom = 100%)

---

## 🛠️ Desenvolvimento local

```bash
npm install
npm start
```

O app abre em `http://localhost:3000`.

---

## 🎨 Funcionalidades

- ✅ Calendário mensal com navegação por toque
- ✅ Vista de dia com todos os compromissos
- ✅ Criar compromisso com: nome, emoji, cor, horário, observação
- ✅ Apagar compromisso
- ✅ Sincronização em tempo real com Google Calendar
- ✅ Criação automática de um calendário dedicado
- ✅ Emojis flutuantes animados
- ✅ Login seguro com Google OAuth 2.0

---

## 🗂️ Estrutura do projeto

```
geladeira-calendar/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── CalendarView.js   # Grade mensal
│   │   ├── DayView.js        # Lista de eventos do dia
│   │   ├── AddEventModal.js  # Formulário de novo evento
│   │   └── LoginScreen.js    # Tela de login Google
│   ├── hooks/
│   │   └── useGoogleCalendar.js  # Toda a lógica da API
│   ├── googleConfig.js       # ⚙️ CONFIGURE AQUI
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
└── README.md
```

---

## 🔒 Segurança

- As credenciais Google ficam no `googleConfig.js`. Se o repositório for público, considere restringir a API key ao seu domínio no Google Cloud Console.
- O arquivo `.gitignore` já exclui `.env` se você preferir usar variáveis de ambiente.

---

Feito com 💜 para momentos mágicos!
