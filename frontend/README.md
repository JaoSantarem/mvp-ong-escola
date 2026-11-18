# Frontend

Interface React compilada pelo Vite.

## Estrutura

```text
src/
├── main.jsx                 # Montagem do React e estilos globais
├── App.jsx                  # Conecta sessão, dados e tela atual
├── hooks/                   # Sessão, formulários de acesso e menu mobile
├── navigation/              # Itens do menu, áreas e escolha da tela
├── pages/                   # Dashboard, oficinas, participantes, equipe e outras telas
├── components/
│   ├── layout/              # Menu, cabeçalho e estrutura visual
│   ├── ui/                  # Formulários, campos, títulos e painéis compartilhados
│   └── calendar/            # Calendário de encontros e chamada
├── features/
│   └── finance/
│       ├── components/      # Detalhes do lançamento e exportação
│       ├── constants.js     # Tipos, situações, campos e estado inicial
│       └── utils.js         # Valores, datas e arquivos do financeiro
├── services/
│   ├── api.js               # Endereço e transporte das chamadas HTTP
│   ├── client.js            # Token, JSON e erros da sessão
│   ├── auth.js              # Requisições públicas de cadastro, login e convite
│   └── loadOrganization.js  # Carregamento compartilhado por área de acesso
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

## Interface e navegação

O painel de visão geral é a entrada do sistema. O menu tem seis destinos: visão geral, oficinas e turmas, participantes, projetos, financeiro e equipe. As subseções ficam dentro do próprio módulo; membros e suas permissões são exibidos apenas para administradores.

As telas de participantes, oficinas e projetos priorizam a consulta, com busca local por nome (e responsável, descrição ou fonte conforme a tela). O botão principal abre o cadastro em modal. Fechar o cadastro preserva os campos enquanto a tela permanece aberta; o envio bem-sucedido fecha o modal e mostra a confirmação. Não há salvamento de rascunho ao sair do módulo ou recarregar.

O financeiro separa resumo e lançamentos, com a ação Novo lançamento abrindo um modal sobre a consulta atual. As turmas separam encontros/chamada de matrículas/instrutores; o cadastro de encontro abre em modal pela ação Novo encontro. Matrícula e vínculo de instrutor também usam modais próprios. A equipe separa instrutores e membros. Nas permissões dos membros, Dia a Dia e Gestão substituem o seletor de cargo.

`src/styles/design.css` define os tokens de cor e o tratamento visual compartilhado (menu, títulos, botões, cartões, tabelas, campos e estados). `src/navigation/catalog.js` contém somente a navegação, sem uma página de catálogo. Os componentes `FormModal` e `ListToolbar` padronizam os fluxos de cadastro e consulta. `FormModal` usa um diálogo nativo com foco contido, Esc para fechar, retorno do foco e bloqueio da rolagem de fundo. Apenas um modal de formulário pode ficar aberto por vez; no celular, os campos ficam em uma coluna. Na chamada, presença, inclusão de aluno e observações aparecem em etapas separadas no mesmo diálogo.

## Projetos, fotos e permissões por área

- O resumo financeiro combina período e projeto usando o identificador do projeto. Há opções Todos os projetos e Sem projeto.
- O nome de cada projeto abre sua área, com orçamento, fonte de recurso e galeria. O filtro da galeria usa a data informada para a foto, com limites inclusivos.
- Participantes e instrutores escolhem a foto no modal de adicionar/editar; membros mantêm a ação de foto na lista. As imagens são carregadas com autenticação; tokens não são incluídos nas URLs.
- Membros têm as caixas Dia a Dia (painel, oficinas e participantes) e Gestão (projetos, financeiro e equipe). O menu e a API respeitam essas áreas. As regras existentes para alterações por administradores/coordenação continuam válidas.
- Administradores mantêm ambas as áreas. Membros existentes preservam o acesso anterior até serem configurados; novos membros começam com Dia a Dia marcado e Gestão desmarcado. Sem ambas, o membro vê um aviso de ausência de áreas liberadas.

Execute `npm test` para verificar a seleção de projetos e a navegação por área.

Participantes e instrutores usam o mesmo modal para adicionar e editar, com botão de lápis na lista e foto de perfil opcional nos dois modos. Ao editar sem selecionar uma foto, a imagem atual é preservada. Se o envio da foto falhar após salvar os dados, a nova tentativa usa o identificador já criado, evitando duplicar o cadastro.

A foto de perfil de participantes/instrutores é escolhida pelo avatar ampliado no modal (clique ou teclado), com indicador +, prévia e descarte de seleção. As listas mantêm somente o avatar e o lápis de edição, sem botão redundante de foto. O cabeçalho mostra o e-mail da sessão.

Encontros têm a aba Imagens na chamada. O envio usa uma etapa dentro do mesmo diálogo, sem empilhar modais. Despesas têm a marcação Equipe (staff) e vínculos opcionais com membros, instrutores e participantes; a identificação aparece na lista, nos detalhes e no CSV. Doações mantêm o vínculo opcional com projeto, sem classificação de staff.

## Paleta InveRso

O tema `src/styles/inverso.css`, carregado após os estilos base, adapta as cores observadas na identidade do Instituto InveRso no perfil da Atados: vermelho #D33F33, coral #F26B55, roxo #9B336E e ameixa #491A3A. Os valores são amostrados da imagem de referência, não de um manual oficial. Menu e seleção usam roxo; ações principais, vermelho; fundos permanecem claros. Estados de sucesso, erro e alerta mantêm diferenciação semântica. A paleta também cobre autenticação e navegação mobile.

Encontros podem ser excluídos por administradores/coordenação usando o botão de lixeira. O modal consulta os registros vinculados, exige ciência da exclusão permanente e a senha atual da conta conectada. A conta de demonstração não tem uma senha conhecida; use uma conta com senha definida. Sair/Entrar com minha conta abre o login manual, sem reentrar automaticamente na demonstração.

## Manutenção

Consulte [MANUTENCAO.md](../MANUTENCAO.md) antes de alterar campos, navegação ou chamadas à API. O arquivo `App.jsx` coordena as partes; os detalhes de login ficam em `hooks/useAuthForm.js`, a sessão em `hooks/useSession.js` e as rotas em `navigation/AppRoutes.jsx`. `npm test` cobre também o cliente HTTP e as consultas condicionadas às permissões.
