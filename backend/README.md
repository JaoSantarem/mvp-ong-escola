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
