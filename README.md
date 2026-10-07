# InPETU Connect

Portal público e CRM para os espaços do InPETU Hub, UFSC, no Lote 73 do Sapiens Parque. O projeto usa Java 25, Spring Boot 3, MySQL 8, React 18, Vite, Tailwind CSS, Headless UI e Lucide.

## Visão geral

- **Portal público:** catálogo de espaços, consulta de agenda e disponibilidade, solicitação de reservas e de visitas guiadas, cadastro de solicitantes e canal de dúvidas com anexo.
- **CRM da equipe:** aprovação e edição de reservas, gestão de espaços e organizações, atendimento de chamados, classificação de solicitantes em personas P1–P6, notificações e auditoria.
- **Perfis de acesso:** Coordenador, Gestor de Espaços, Staff/Atendente e Solicitante Público, com controle de permissões também no backend (RBAC).
- **Autenticação:** login por e-mail e senha com token JWT; senhas armazenadas com BCrypt.
- **Dois bancos de dados:** o sistema trabalha com um banco principal e um banco de teste (dados fictícios), e permite alternar entre eles dentro do próprio site. O token de login é vinculado ao banco em que foi emitido.
- **Implantação:** o frontend e a API são empacotados juntos (Dockerfile) e publicados no Railway.

## E-mail e anexos

O acesso usa e-mail e senha; o cadastro público define a senha no momento da criação. O envio de e-mails (respostas dos chamados e notificações de reservas) é opcional e depende de um servidor SMTP configurado no ambiente. As notificações também ficam disponíveis no painel autenticado de cada solicitante e da equipe. Sem SMTP habilitado, elas continuam registradas no painel e o status do e-mail fica indicado como não enviado.

Anexos PDF, PNG e JPG até 10 MB e imagens de espaços PNG/JPG até 5 MB são armazenados em disco no servidor, em volume persistente em produção. Ao cadastrar um espaço, a equipe pode digitar um tipo/categoria novo e incluir nome, capacidade, descrição/equipamentos e imagem.

## API principal

- Público: `GET /espacos`, `GET /espacos/{id}/agenda`, `POST /usuarios/cadastro-publico` (inclui senha), `POST /auth/login`, `POST /duvidas`, `GET /database`.
- Solicitante autenticado: `POST /reservas`, `GET /reservas/minhas`, `DELETE /reservas/{id}/cancelar` e `GET /notificacoes/minhas`.
- Equipe: consulta e aprovação de reservas, edição (`PUT /reservas/{id}`), registro de negociação de excedentes (`PATCH /reservas/{id}/negociacao`), gestão de espaços e organizações, atendimento, classificação P1–P6 (`GET /usuarios/personas` e `PUT /usuarios/{id}/persona`), perfis e auditoria; RBAC é aplicado também no backend.
- Usuários autenticados podem marcar notificações como lidas com `PATCH /notificacoes/{id}/lida` ou `PATCH /notificacoes/lidas`.

Todas as rotas ficam sob `/api/v1`. Qualquer chamada pode incluir `X-Database: test` para usar o banco de teste.

## Regras de negócio

As cotas mensais são de horas reservadas e não acumulam saldo de um mês para outro: P2 tem 30 h, P3 tem 20 h, P4 tem 10 h e P5 tem 10 h. P1 e P6 estão sem limite mensal definido na tabela de referência. Reservas pendentes e confirmadas contam para o mês-calendário da data reservada; canceladas não consomem cota. Ao exceder o limite, a solicitação fica pendente, bloqueia o horário e gera notificação para a equipe. A equipe registra o contato e o resultado da negociação antes de poder aprová-la. A equipe também pode consultar e editar reservas; mudanças são auditadas no momento da operação.

Reservas concorrentes bloqueiam a linha do espaço durante a validação e retornam HTTP 409 quando há sobreposição. A primeira solicitação válida bloqueia o intervalo mesmo enquanto aguarda aprovação; prioridade não permite substituir uma reserva anterior. Cancelamentos feitos por solicitantes exigem pelo menos 15 dias de antecedência; dentro desse prazo, somente a equipe pode autorizar o cancelamento. Cancelamento e descredenciamento exigem justificativa não vazia, e as alterações são registradas na auditoria no momento da operação. A persona é interna e nunca é coletada no cadastro público.

Ao marcar um espaço como inativo, a equipe deve informar o motivo. O espaço permanece visível no catálogo com o status `INDISPONÍVEL`, e a agenda e novas solicitações mostram essa justificativa. Reativar o espaço remove o motivo de indisponibilidade.

Visitas guiadas são solicitações sujeitas à confirmação da equipe. O solicitante informa data, horário e quantidade de visitantes; o primeiro pedido bloqueia o intervalo enquanto aguarda análise, assim como nos demais espaços. A capacidade máxima do grupo é validada pelo backend.

## Documentação

Uma visão geral do sistema, módulos, dados fictícios e roteiro de validação está no PDF `docs/InPETU-Connect-NotebookLM.pdf`, pronto para importar no NotebookLM.

> Instruções de instalação, configuração, implantação e credenciais não fazem parte deste repositório público.
