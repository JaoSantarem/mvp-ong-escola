# MVP de gestão para ONGs e escolas

Aplicação web com React/Vite, API REST em Java 17/Spring Boot e banco MySQL 8.

## Executar localmente

Requisitos: Java 17+, Maven, Node.js e Docker ativo.

1. Copie `.env.example` para `.env` e defina valores locais para `DB_PASSWORD` e `DB_ROOT_PASSWORD`.
2. Na raiz do projeto, execute: `docker compose up -d mysql`.
3. Defina `DB_PASSWORD` no terminal que vai executar a API, entre em `backend` e execute: `mvn spring-boot:run`.
4. Em outro terminal, entre em `frontend`, execute `npm install` e depois `npm run dev -- --port 4080`.
5. Abra http://localhost:4080 e use o cadastro para criar a organização e o administrador.

A API atende em http://localhost:8080. O frontend usa proxy para /api. O perfil da organização (ONG ou escola) é escolhido no cadastro inicial.

## Funcionalidades

- Multi-tenancy por organização e autenticação por token Bearer.
- Papéis de administrador, coordenação, instrutor e participante.
- Oficinas com conteúdo/descrição e instrutores sem quantidade mínima fixa.
- Participantes, responsável para menores, consentimento de imagem e matrícula.
- Encontros, chamada por participante e observações pedagógicas.
- Projetos, fontes de recurso, orçamento, despesas associadas opcionalmente a oficinas e aprovação/recusa.
- Anexo de comprovante PDF/PNG/JPG por despesa, guardado localmente em backend/uploads e servido apenas ao usuário autenticado da mesma organização.
- Visão geral da organização e exportação de despesas CSV.

## Rotas centrais

/api/setup, /api/me, /api/workshops, /api/students, /api/instructors, /api/users, /api/projects, /api/expenses, /api/workshops/{id}/meetings, /api/workshops/{id}/enrollments, /api/meetings/{id}/attendance, /api/meetings/{id}/notes, /api/reports/summary e /api/reports/expenses.csv.

## Limites desta versão

A prestação de contas está estruturada para controle operacional. Modelos específicos por edital/instrumento, exportação PDF/XLSX, conciliação bancária e gestão documental avançada ainda não fazem parte deste corte. Para produção, configure armazenamento persistente e seguro, HTTPS, gestão de segredos, backups e política de retenção.

