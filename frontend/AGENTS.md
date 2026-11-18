# Interface do sistema

## Padrão de formulários de inclusão

- Toda ação de adicionar, criar, cadastrar, matricular ou vincular deve abrir o formulário em modal, usando `src/components/ui/FormModal.jsx`.
- Não exiba formulários de inclusão diretamente nas listas ou páginas.
- No mobile, mantenha apenas um formulário visível e um modal aberto por vez. Não empilhe modais; para tarefas relacionadas use etapas no mesmo diálogo ou feche o anterior antes de abrir o próximo.
- Mantenha foco acessível, fechamento por Esc, bloqueio da rolagem de fundo e mensagens de erro dentro do modal. Os campos devem ocupar uma coluna no mobile.
