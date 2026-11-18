# Backend

## Estrutura

- App.java: inicialização do Spring Boot e varredura dos subpacotes.
- controller/: endpoints HTTP e contratos de entrada e saída usados por cada controller.
- model/: entidades JPA, com campos privados e métodos de acesso.
- repository/: interfaces de acesso ao banco pelo Spring Data JPA.
- security/: geração e validação dos tokens e filtro de autenticação.
- config/: configuração de segurança, CORS e documentação OpenAPI.
- migration/: compatibilidade com esquemas legados.

Os nomes das entidades, tabelas e rotas HTTP foram preservados. A visibilidade Jackson dos campos existentes foi mantida; os novos métodos de acesso não ampliam os dados retornados.

A extração das regras de negócio dos controllers para serviços é uma etapa posterior. Não há pasta service vazia simulando essa separação.

## Validação

Execute mvn clean package dentro de backend/.

## Áreas de acesso e fotos

`GET /api/me` e as respostas de membros incluem `dayToDayAccess` e `managementAccess`. O administrador altera as áreas em `PUT /api/users/{id}/areas`. A validação ocorre em cada requisição, inclusive para tokens emitidos antes da alteração. As permissões de função para criar, aprovar e administrar continuam em vigor. Os campos novos são opcionais no banco para preservar o acesso anterior dos membros existentes; novos membros recebem Dia a Dia por padrão. Administradores sempre mantêm as duas áreas.

`GET /api/ledger` inclui `projectId`, permitindo distinguir projetos com nomes iguais.

Fotos:

- `GET /api/photos/{type}/{ownerId}?from=AAAA-MM-DD&until=AAAA-MM-DD`: galeria por proprietário e período inclusivo.
- `POST /api/photos/{type}/{ownerId}`: multipart com `files`, `photoDate` e `caption`. Tipos: PROJECT, STUDENT, INSTRUCTOR ou MEMBER.
- `GET /api/photos/avatars/{type}`: foto mais recente por pessoa da organização.
- `GET /api/photos/files/{id}`: arquivo autenticado, com verificação da organização e da área de acesso.

Aceita JPG/PNG reais, até 8 MB e 40 megapixels por foto. Projetos aceitam até 10 fotos e 30 MB por envio; fotos de perfil, uma por envio. Os metadados ficam em `photo_asset`; os arquivos em `${app.upload-dir:uploads}/photos`. Preserve essa pasta junto com o banco nos backups. O volume uploads da implantação Docker já abrange essa pasta. O histórico anterior de fotos de perfil é preservado; a listagem usa a última foto enviada.

`mvn test` executa os testes de permissões, revogação de token, isolamento por organização, validação de imagens, persistência e filtros. Eles usam H2 em memória e uma pasta temporária, sem escrever no banco local da aplicação.

Fotos do tipo MEETING usam os mesmos endpoints, limites e armazenamento da galeria de projeto. O proprietário é o encontro da organização autenticada; a área Dia a Dia é obrigatória e instrutores também podem anexar imagens aos encontros.

Lançamentos recebem `staffExpense`, `participantIds`, `instructorIds` e `memberIds`, exclusivos de despesas. Os vínculos são validados na organização antes de criar a despesa e persistidos na mesma transação. `GET /api/ledger/people` fornece apenas nomes e identificadores para seleção. A listagem expõe `staffExpense`, `expenseOrigin`, `team` e `participants` para consulta/exportação. Cadastros financeiros antigos continuam válidos sem marcação de staff.

## Exclusão de encontros com senha

`GET /api/meetings/{id}/deletion-preview` lista os totais da chamada, observações e imagens afetadas. `DELETE /api/meetings/{id}` recebe `{ "password": "senha atual", "confirmed": true }`. Apenas ADMIN/COORDINATOR da organização do encontro, com área Dia a Dia, podem excluir. A senha é comparada ao hash da própria conta; não há exceção para demonstração. Cinco senhas incorretas bloqueiam a tentativa por 15 minutos (controle local à instância).

A exclusão remove o encontro e seus registros de chamada, observações e metadados de fotos em uma transação. Os arquivos são limpos somente após o commit. Oficina, pessoas e outros encontros são preservados. Exclusão e upload de fotos do encontro usam o mesmo bloqueio de banco para evitar anexos concorrentes órfãos. Não é autenticação de dois fatores: é confirmação destrutiva com a senha atual.
