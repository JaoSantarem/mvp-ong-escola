# Frontend

Interface React compilada pelo Vite.

## Estrutura

```text
src/
├── main.jsx                 # Montagem do React e estilos globais
├── App.jsx                  # Sessão, carregamento de dados e navegação
├── pages/                   # Dashboard, oficinas, participantes, equipe e outras telas
├── components/
│   ├── ui/                  # Formulários, campos, títulos e painéis compartilhados
│   └── calendar/            # Calendário de encontros e chamada
├── features/
│   └── finance/
│       ├── components/      # Detalhes do lançamento e exportação
│       ├── constants.js     # Tipos, situações, campos e estado inicial
│       └── utils.js         # Valores, datas e arquivos do financeiro
├── services/
│   └── api.js               # Endereço e transporte das chamadas HTTP
├── styles/
│   └── global.css           # Estilos compartilhados da interface
└── utils/
    └── formatters.js        # Formatação compartilhada de moeda, data e telefone
```

As telas são arquivos próprios. Os antigos arquivos views.jsx e FinanceView.jsx foram substituídos pelos módulos acima; o financeiro legado sem uso foi removido.

## Executar

Dentro de frontend/, execute npm ci e npm run dev. Para produção, execute npm run build; o resultado continua em dist/.

Defina VITE*API_URL com a origem do backend, por exemplo https://ong-backend-oqmy.onrender.com. Sem essa variável, as chamadas usam /api/ no mesmo domínio, mantendo o proxy local e a implantação Docker. Nunca coloque credenciais de banco em variáveis VITE*.

No Render continuam iguais: Root Directory frontend, Build Command npm ci && npm run build, Publish Directory dist.
