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

## Acesso na rede local

Para outra pessoa na mesma rede Wi-Fi/LAN acessar durante o desenvolvimento:

1. Inicie a API e o MySQL como descrito acima.
2. No frontend, execute `npm run dev -- --host 0.0.0.0 --port 4080`.
3. No Windows, descubra o IPv4 do computador com `ipconfig` e permita a porta TCP 4080 no Firewall do Windows para a rede privada/local.
4. A outra pessoa abre `http://IP-DO-COMPUTADOR:4080` no navegador.

O banco e a API ficam vinculados ao próprio computador; somente o frontend de desenvolvimento fica acessível pela LAN. Esse acesso é apropriado para demonstração na rede local. Para uso pela internet, use a implantação pública abaixo.

## Implantação pública com Docker

O perfil de produção sobe MySQL, API Java e o site React em containers. O Caddy serve a aplicação e encaminha `/api` e o Swagger para a API; apenas as portas 80 e 443 são publicadas. Banco, API e arquivos anexados usam volumes persistentes.

Requisitos: um servidor Linux público com Docker Engine e Compose, um domínio/subdomínio apontado pelo registro DNS A (e AAAA, se houver IPv6) para o IP do servidor e as portas TCP 80/443 liberadas no firewall do servidor e do provedor.

1. No servidor, clone o repositório e entre na pasta do projeto.
2. Copie `.env.example` para `.env` e preencha `DB_PASSWORD`, `DB_ROOT_PASSWORD` e `DOMAIN`. Use senhas longas e únicas; não envie `.env` ao Git.
3. Depois que o DNS estiver apontando para o servidor, execute `docker compose -f docker-compose.prod.yml up -d --build`.
4. Acesse `https://SEU-DOMINIO`. O Caddy solicita e renova o certificado HTTPS automaticamente quando o domínio e as portas públicas estão configurados corretamente.

Comandos úteis: `docker compose -f docker-compose.prod.yml logs -f`, `docker compose -f docker-compose.prod.yml ps` e `docker compose -f docker-compose.prod.yml down`. Para atualizações, faça `git pull` e rode novamente `docker compose -f docker-compose.prod.yml up -d --build`. Faça backup regular dos volumes `mysql_data` e `uploads`; `down` preserva os volumes. A implantação preparada não inclui ainda domínio, servidor, DNS, backups remotos ou monitoramento configurados.

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

