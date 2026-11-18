# Guia de manutenção

O sistema tem duas partes: a interface React em `frontend/` e a API Java em `backend/`.
Comece pela tela que deseja alterar. Você não precisa entender o projeto inteiro para mudar um campo.

## Onde fazer cada alteração

| O que você quer mudar                   | Arquivo ou pasta                                                 |
| --------------------------------------- | ---------------------------------------------------------------- |
| Campos de participantes e sua foto      | `frontend/src/pages/PeoplePage.jsx`                              |
| Cadastro e lista de oficinas            | `frontend/src/pages/WorkshopsPage.jsx`                           |
| Encontros, chamada e matrículas         | `frontend/src/pages/ClassroomPage.jsx`                           |
| Instrutores, membros e acessos          | `frontend/src/pages/TeamPage.jsx`                                |
| Projetos e galeria                      | `frontend/src/pages/ProjectsPage.jsx` e `ProjectDetailsPage.jsx` |
| Resumo e lançamentos financeiros        | `frontend/src/pages/FinancePage.jsx` e `features/finance/`       |
| Cores inspiradas no Inverso             | `frontend/src/styles/inverso.css`                                |
| Espaçamento, tabelas e campos           | `frontend/src/styles/design.css`                                 |
| Efeitos de clique e botões de navegação | `frontend/src/styles/interactions.css`                           |
| Itens do menu e regras de navegação     | `frontend/src/navigation/catalog.js`                             |
| Escolha da tela a exibir                | `frontend/src/navigation/AppRoutes.jsx`                          |
| Menu, cabeçalho e estrutura visual      | `frontend/src/components/layout/AppLayout.jsx`                   |
| Login, cadastro e primeira senha        | `frontend/src/hooks/useAuthForm.js`                              |
| Sessão, demonstração, convite e saída   | `frontend/src/hooks/useSession.js`                               |
| Token, respostas e erros HTTP           | `frontend/src/services/client.js`                                |
| Dados compartilhados entre as telas     | `frontend/src/services/loadOrganization.js`                      |
| Regras e rotas da API                   | `backend/src/main/java/br/org/social/controller/`                |
| Campos salvos no banco                  | `backend/src/main/java/br/org/social/model/`                     |
| Consultas ao banco                      | `backend/src/main/java/br/org/social/repository/`                |

## Como uma ação percorre o código

1. `App.jsx` conecta a sessão, os dados e a navegação.
2. `AppRoutes.jsx` escolhe uma página, por exemplo `PeoplePage.jsx`.
3. A página mostra a lista e abre o formulário em `FormModal`.
4. Ao salvar, a página chama `api("students", "POST", dados)`.
5. `services/client.js` envia JSON com o token e trata erros da API.
6. No Java, o controller valida a conta, a organização e os dados antes de salvar pelo repository.
7. `doAction` atualiza os dados compartilhados e retorna `true` ou `false`. A página fecha o formulário somente após sucesso.

`api("students")` consulta. `api("students/3", "PUT", dados)` edita.
Os caminhos são relativos a `/api/`; não escreva o endereço do servidor nas páginas.
Uploads usam `services/api.js` diretamente porque enviam `FormData`, em vez de JSON.

## Como o financeiro calcula os saldos

A despesa guarda a decisão de aprovação. Cada pagamento ou recebimento cria um registro em `LedgerEvent` com valor, conta e data efetiva. Um estorno cria outro registro com o valor negativo e uma referência à baixa original. O histórico permite conferir os dois movimentos. A correção de uma despesa a devolve para aprovação.

- `LedgerController.java` cria os lançamentos, divide parcelas em centavos e monta as linhas para consulta.
- `FinancialActions.java` valida as mudanças de situação e calcula o valor baixado e o saldo em aberto. A revisão apresentada na tela e o bloqueio da linha protegem contra baixas duplicadas.
- `frontend/src/features/finance/summary.js` soma baixas pela data de movimentação e valores ainda em aberto pelo vencimento. Valores sem vencimento aparecem na consulta sem período.
- Receitas antigas conservam a data do recebimento. Uma despesa antiga aprovada passa a contar como paga quando recebe uma baixa.

## Como ler os formulários React

```jsx
const [name, setName] = useState("");
```

`name` é o valor atual. `setName` altera esse valor e atualiza a tela.
No campo, `value={name}` exibe o texto e `onChange={(event) => setName(event.target.value)}` guarda a digitação.
Os estados agora ficam em declarações separadas, com setters chamados `setNomeDoEstado`.

## Exemplo: acrescentar um campo no participante

1. Em `PeoplePage.jsx`, crie o estado, acrescente um `Field` ao formulário e envie o valor no objeto de `api(...)`.
2. Preencha esse estado em `openEditor`, para a edição mostrar o valor existente. Limpe-o após salvar.
3. No backend, localize a rota `students` em `AcademicController.java`. Atualize o contrato de entrada, a validação e as duas operações: criar e editar.
4. Acrescente o campo à entidade `Student.java` e confira se ele aparece na resposta esperada.
5. Execute as verificações abaixo. Mudanças no banco exigem também conferir compatibilidade com registros já existentes.

## Exemplo: adicionar uma tela ao menu

1. Crie um componente em `frontend/src/pages/`.
2. Registre o destino em `navigation/catalog.js` e confira sua área em `canAccessPage`.
3. Acrescente um `case` em `navigation/AppRoutes.jsx`.
4. Se precisar de dados compartilhados, acrescente a consulta em `services/loadOrganization.js`, respeitando as áreas de acesso.
5. Confira que o backend também valida acesso; esconder um item do menu não protege uma rota.

## Padrões a manter

- Use `FormModal` para adicionar, editar, matricular e vincular. No celular, mantenha um único formulário aberto.
- Prefira nomes completos (`setMeeting`, `setName`) a letras ou abreviações.
- Reutilize `Field`, `Heading`, `Panel`, `EditButton` e os componentes de fotos.
- Uma mudança de nome no JavaScript não deve alterar nomes de campos JSON ou rotas existentes.
- Preserve o filtro da organização e as permissões no backend.
- Convites de primeira senha abrem o acesso manual, sem entrar automaticamente na demonstração.
- Dados ficam no MySQL; fotos e anexos ficam em `backend/uploads`. Preserve ambos no backup.

## Como verificar uma mudança

Na pasta `frontend/`:

```powershell
npm test
npm run build
```

Na pasta `backend/`:

```powershell
mvn test
```

Os testes Java usam banco em memória e arquivos temporários. Não apagam encontros do banco local.
Na raiz, `npm run format:check` confere a formatação. Para formatar apenas o arquivo alterado:

```powershell
npx prettier --write frontend/src/pages/PeoplePage.jsx
```

Para executar o sistema, siga o `README.md` da raiz. Nunca coloque o arquivo `.env` ou senhas no Git.

## Escopo desta simplificação

O arquivo principal foi dividido por responsabilidade, o fluxo de autenticação ganhou funções curtas e os estados das telas ganharam nomes legíveis.
As telas continuam usando React simples, sem biblioteca nova de rotas ou estado global. Os contratos da API e o esquema do banco foram preservados.
As regras Java continuam nos controllers existentes; consulte `backend/README.md` para o mapa do backend.
