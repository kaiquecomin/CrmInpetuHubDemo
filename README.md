# InPETU Connect

Portal público e CRM para os espaços do InPETU Hub, UFSC, no Lote 73 do Sapiens Parque.

**Stack:** Java 25, Spring Boot 3, MySQL 8, React 18, Vite, Tailwind CSS, Headless UI e Lucide.

## Visão geral

- **Portal público:** catálogo de espaços, consulta de agenda e disponibilidade, solicitação de reservas e de visitas guiadas, cadastro de solicitantes e canal de dúvidas com anexo.
- **CRM da equipe:** aprovação e edição de reservas, gestão de espaços e organizações, atendimento de chamados, classificação de solicitantes em personas P1–P6, notificações e auditoria.
- **Perfis de acesso:** Coordenador, Gestor de Espaços, Staff/Atendente e Solicitante Público, com RBAC aplicado também no backend.
- **Autenticação:** login por e-mail e senha; o JWT é entregue em cookie `HttpOnly`, `Secure` e `SameSite=Strict`. As senhas são armazenadas com BCrypt.
- **Banco de dados:** cada implantação usa um único banco MySQL, definido por variáveis de ambiente. Os dados fictícios para desenvolvimento são carregados apenas ao iniciar a API local com o perfil `demo`.
- **Implantação:** frontend e API são empacotados juntos pelo `Dockerfile` e publicados no Railway.

## Requisitos

- JDK 25 e Maven 3.9+
- Node.js 20+ e npm
- MySQL 8.0

Crie o banco antes de iniciar a aplicação:

```sql
CREATE DATABASE inpetu_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

## Configuração e execução local

O backend exige as variáveis de ambiente listadas abaixo. Defina-as no terminal ou na IDE; o Spring Boot não lê arquivos `.env` automaticamente.

```bash
# Backend (porta 8080)
mvn spring-boot:run

# Frontend, em outro terminal (porta 5173)
npm install
npm run dev
```

Com a aplicação no ar, o portal fica em `http://localhost:5173` e a API em `http://localhost:8080/api/v1`.

Para testar com dados fictícios, use `scripts/start-local-demo.ps1`. Se `scripts/local-secrets.ps1` existir, o script usa os valores definidos nele e pergunta apenas os que faltarem; as senhas digitadas não são exibidas. O script aponta a API somente para um MySQL em `localhost`. O arquivo real de segredos é ignorado pelo Git; o guia para cadastrar as contas de teste está em [docs/passbolt-local-test-access.md](./docs/passbolt-local-test-access.md). Nunca grave senhas no repositório.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_URL` | sim | URL JDBC do banco MySQL |
| `DB_USER` | sim | Usuário do banco |
| `DB_PASSWORD` | sim | Senha do banco |
| `JWT_SECRET` | sim | Segredo de assinatura dos tokens, com 32 ou mais caracteres |
| `APP_ADMIN_EMAIL` | condicional | E-mail do primeiro coordenador, quando não houver perfil 1 |
| `APP_ADMIN_PASSWORD` | condicional | Senha do primeiro coordenador (12 a 72 caracteres), quando não houver perfil 1 |
| `DEMO_ADMIN_PASSWORD` | perfil `demo` | Senha da conta administrativa de demonstração |
| `INPETU_DEMO_PASSWORD_*` | perfil `demo` | Senhas distintas para as demais contas locais de demonstração |
| `TRUSTED_PROXIES` | não | Lista separada por vírgulas de IPs de proxies confiáveis; vazia por padrão |
| `APP_UPLOAD_DIR` | não | Pasta de anexos e imagens. Em produção, aponte para um volume persistente |
| `JWT_EXPIRATION_MS` | não | Validade do token. O padrão é 8 horas |
| `FRONTEND_ORIGIN` | não | Origem liberada no CORS. O padrão é `http://localhost:5173` |
| `MAIL_*` | não | Configuração do SMTP para envio de e-mails |

`APP_ADMIN_EMAIL` e `APP_ADMIN_PASSWORD` criam o primeiro coordenador apenas uma vez, se ainda não existir nenhum usuário com perfil 1. Sem elas, a aplicação registra um aviso e não cria conta administrativa. Não alteram nem removem contas existentes. Remova essas duas variáveis depois de confirmar o acesso.

`DB_TEST_PASSWORD` é legado e não é consumido: cada implantação usa um único banco, sem seletor de banco de teste. A aplicação exige `DB_PASSWORD` sem valor padrão. Veja [.env.example](./.env.example) para os nomes, todos sem valores.

## Implantação no Railway

1. Conecte o repositório a um projeto no Railway e adicione um serviço MySQL.
2. Defina as variáveis acima no serviço da aplicação, referenciando as credenciais do MySQL.
3. Crie um volume persistente para os uploads e aponte `APP_UPLOAD_DIR` para ele. Sem volume, anexos e imagens são perdidos a cada novo deploy.
4. Gere o domínio em **Settings → Networking**.

O healthcheck usa `/api/v1/database`.

## E-mail e anexos

O cadastro público define a senha no momento da criação. O envio de e-mails (respostas dos chamados e notificações de reservas) é opcional e depende de um servidor SMTP. As notificações também ficam disponíveis no painel autenticado de cada solicitante e da equipe. Sem SMTP habilitado, elas continuam registradas no painel e o status do e-mail fica indicado como não enviado.

Anexos PDF, PNG e JPG de até 10 MB e imagens enviadas pela equipe (PNG/JPG de até 5 MB) são armazenados em disco no servidor. As 18 fotos oficiais do catálogo são imagens JPG otimizadas, empacotadas no build e servidas pela própria aplicação; não dependem de volume nem de URL externa. O nome numerado dos arquivos identifica a sala: a primeira imagem de cada grupo é a capa e as demais aparecem na galeria da mesma sala.

## API principal

- **Público:** `GET /espacos`, `GET /espacos/{id}/agenda`, `POST /usuarios/cadastro-publico`, `POST /auth/login`, `POST /auth/logout`, `POST /duvidas`.
- **Sessão:** `GET /auth/session` confirma a sessão autenticada pelo cookie HttpOnly. O corpo do login não devolve o JWT.
- **Solicitante autenticado:** `POST /reservas`, `GET /reservas/minhas`, `DELETE /reservas/{id}/cancelar` e `GET /notificacoes/minhas`.
- **Equipe:** consulta e aprovação de reservas, edição (`PUT /reservas/{id}`), registro de negociação de excedentes (`PATCH /reservas/{id}/negociacao`), gestão de espaços e organizações, atendimento, classificação P1–P6 (`GET /usuarios/personas` e `PUT /usuarios/{id}/persona`), edição de cadastro (`PUT /usuarios/{id}/cadastro`), desativação e auditoria.
- **Notificações:** marcação como lida com `PATCH /notificacoes/{id}/lida` ou `PATCH /notificacoes/lidas`, para usuários autenticados.

Todas as rotas ficam sob `/api/v1`.

## Regras de negócio

**Catálogo de espaços.** Na inicialização, o catálogo inicial é reconciliado pelo nome de forma idempotente. Espaços existentes mantêm IDs e reservas, e os faltantes são criados. `Sala de Aula 1` e `Visita Guiada` ficam inativos, sem exclusão física, e continuam visíveis com o motivo de indisponibilidade. Os nove espaços ativos são contados separadamente.

**Cotas mensais.** São medidas em horas reservadas e não acumulam saldo de um mês para outro: P2 tem 30 h, P3 tem 20 h, P4 tem 10 h e P5 tem 10 h. P1 e P6 não têm limite mensal definido na tabela de referência. Reservas pendentes e confirmadas contam para o mês-calendário da data reservada; reservas canceladas não consomem cota.

**Aprovação automática.** Pedidos de solicitantes P1–P5 são confirmados automaticamente quando não excedem a cota e não são visitas guiadas nem espaços com aprovação manual. Pedidos de P6, pedidos sem persona, excedentes de cota, visitas guiadas e espaços sinalizados ficam pendentes.

**Excedentes.** Ao exceder o limite, a solicitação bloqueia o horário e gera notificação para a equipe. A equipe registra o contato e o resultado da negociação antes de poder aprová-la.

**Concorrência.** Reservas concorrentes bloqueiam a linha do espaço durante a validação e retornam HTTP 409 quando há sobreposição. A primeira solicitação válida bloqueia o intervalo mesmo enquanto aguarda aprovação; uma solicitação posterior não substitui a anterior.

**Cancelamentos.** Solicitantes precisam cancelar com pelo menos 15 dias de antecedência. Dentro desse prazo, somente a equipe pode autorizar o cancelamento. Cancelamentos e descredenciamentos exigem justificativa não vazia. Edições, cancelamentos e descredenciamentos são registrados na auditoria no momento da operação.

**Organizações de cadastros públicos.** Cada novo cadastro público cria uma organização individual marcada como `Pendente de classificação`, mesmo quando outro cadastro informou o mesmo nome. A equipe revisa e vincula solicitantes à organização correta pelo CRM; nomes iguais não compartilham automaticamente o mesmo `id_organizacao`.

**Indisponibilidade de espaços.** Ao marcar um espaço como inativo, a equipe deve informar o motivo. O espaço continua no catálogo com o status `INDISPONÍVEL`, e a agenda e novas solicitações exibem a justificativa. Reativar o espaço remove o motivo.

**Visitas guiadas.** São solicitações sujeitas à confirmação da equipe. O solicitante informa data, horário e quantidade de visitantes. O primeiro pedido bloqueia o intervalo enquanto aguarda análise, como nos demais espaços. A capacidade máxima do grupo é validada pelo backend.

**Persona.** A classificação P1–P6 é interna e nunca é coletada no cadastro público.