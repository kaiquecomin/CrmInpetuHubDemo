# InPETU Connect

Portal público e CRM para os espaços do InPETU Hub, UFSC, no Lote 73 do Sapiens Parque. O projeto usa Java 25, Spring Boot 3, MySQL 8, React 18, Vite, Tailwind CSS, Headless UI e Lucide.

## Pré-requisitos

- JDK 25 e Maven 3.9+
- Node.js 20+ e npm
- MySQL 8.0

Crie o banco antes de iniciar o backend:

```sql
CREATE DATABASE inpetu_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

O Spring cria/atualiza as tabelas JPA e executa `src/main/resources/import.sql` de forma idempotente. O seed cria os quatro perfis, o coordenador e os seis espaços iniciais. A classificação interna dos solicitantes usa personas P1–P6.

## Executar

Configure `DB_URL`, `DB_USER` e `DB_PASSWORD` antes de iniciar. O segredo JWT `JWT_SECRET` é obrigatório. Para uma execução local simples no PowerShell:

```powershell
$secure = Read-Host "Senha do MySQL" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $secure).Password
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [BitConverter]::ToString($bytes).Replace("-", "")
mvn test
mvn spring-boot:run
```

Em outro terminal:

```powershell
npm install
npm run dev
```

O portal fica em `http://localhost:5173` e a API em `http://localhost:8080/api/v1`. O script `iniciar-inpetu.bat` gera uma chave aleatória se `JWT_SECRET` não estiver definida. Tokens deixam de valer quando uma chave temporária nova é criada; para uma implantação estável, configure um segredo forte e persistente pelo gerenciador de segredos do ambiente. Para gerar o frontend de produção: `npm run build`.

## Ver os dados no HeidiSQL

O HeidiSQL conecta diretamente ao MySQL; não precisa de uma integração adicional no projeto. Crie uma sessão com:

- Tipo de rede: **MySQL (TCP/IP)**
- Host: `127.0.0.1`
- Porta: `3306`
- Usuário: o valor de `DB_USER` (por padrão, `root`)
- Senha: a senha configurada para esse usuário MySQL (`DB_PASSWORD`)

Teste a conexão e, se o banco ainda não existir, abra uma consulta no HeidiSQL e execute:

```sql
CREATE DATABASE IF NOT EXISTS inpetu_connect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Depois de iniciar o backend, atualize a árvore de bancos/tabelas no HeidiSQL com **F5**. O Hibernate cria as tabelas e o `import.sql` inclui os registros iniciais. Para não misturar dados de demonstração com os dados atuais, prefira um banco separado (`inpetu_connect_demo`) e use as instruções de carga demo abaixo. Não envie a senha do MySQL por chat nem a grave no código.

## Acesso inicial

- E-mail: `admin@inpetuhub.ufsc.br`
- Senha inicial do banco padrão (sem profile `demo`): `password`. Com o profile `demo`, essa conta é atualizada para a senha listada na tabela de demonstração.

Troque a senha do coordenador e defina `JWT_SECRET` com pelo menos 32 bytes antes de qualquer implantação. Não reutilize a credencial demonstrativa em produção.

## E-mail e anexos

O acesso usa e-mail e senha; o cadastro público define a senha no momento da criação. Para enviar respostas dos chamados e notificações de reservas, configure `MAIL_ENABLED=true`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_SMTP_AUTH` e `MAIL_SMTP_STARTTLS`. As notificações também ficam disponíveis no painel autenticado de cada solicitante e da equipe. Sem SMTP habilitado, elas continuam registradas no painel e o status do e-mail fica indicado como não enviado. Anexos PDF, PNG e JPG até 10 MB e imagens de espaços PNG/JPG até 5 MB são armazenados em `uploads/inpetu`; monte um volume persistente para esse diretório em produção. Ao cadastrar um espaço, a equipe pode digitar um tipo/categoria novo e incluir nome, capacidade, descrição/equipamentos e imagem.

Use `FRONTEND_ORIGIN` para CORS. O frontend aceita `VITE_API_URL` para apontar a API a outro endereço.

## API principal

- Público: `GET /espacos`, `GET /espacos/{id}/agenda`, `POST /usuarios/cadastro-publico` (inclui senha), `POST /auth/login`, `POST /duvidas`.
- Solicitante autenticado: `POST /reservas`, `GET /reservas/minhas`, `DELETE /reservas/{id}/cancelar` e `GET /notificacoes/minhas`.
- Equipe: consulta e aprovação de reservas, edição (`PUT /reservas/{id}`), registro de negociação de excedentes (`PATCH /reservas/{id}/negociacao`), gestão de espaços e organizações, atendimento, classificação P1–P6 (`GET /usuarios/personas` e `PUT /usuarios/{id}/persona`), perfis e auditoria; RBAC é aplicado também no backend.
- Usuários autenticados podem marcar notificações como lidas com `PATCH /notificacoes/{id}/lida` ou `PATCH /notificacoes/lidas`.

As cotas mensais são de horas reservadas e não acumulam saldo de um mês para outro: P2 tem 30 h, P3 tem 20 h, P4 tem 10 h e P5 tem 10 h. P1 e P6 estão sem limite mensal definido na tabela de referência. Reservas pendentes e confirmadas contam para o mês-calendário da data reservada; canceladas não consomem cota. Ao exceder o limite, a solicitação fica pendente, bloqueia o horário e gera notificação para a equipe. A equipe registra o contato e o resultado da negociação antes de poder aprová-la. A equipe também pode consultar e editar reservas; mudanças são auditadas no momento da operação.

Reservas concorrentes bloqueiam a linha do espaço durante a validação e retornam HTTP 409 quando há sobreposição. A primeira solicitação válida bloqueia o intervalo mesmo enquanto aguarda aprovação; prioridade não permite substituir uma reserva anterior. Cancelamentos feitos por solicitantes exigem pelo menos 15 dias de antecedência; dentro desse prazo, somente a equipe pode autorizar o cancelamento. Cancelamento e descredenciamento exigem justificativa não vazia, e as alterações são registradas na auditoria no momento da operação. A persona é interna e nunca é coletada no cadastro público.

Ao marcar um espaço como inativo, a equipe deve informar o motivo. O espaço permanece visível no catálogo com o status `INDISPONÍVEL`, e a agenda e novas solicitações mostram essa justificativa. Reativar o espaço remove o motivo de indisponibilidade.

Visitas guiadas são solicitações sujeitas à confirmação da equipe. O solicitante informa data, horário e quantidade de visitantes; o primeiro pedido bloqueia o intervalo enquanto aguarda análise, assim como nos demais espaços. A capacidade máxima do grupo é validada pelo backend.

## Dados fictícios para demonstração

Há um perfil de carga separado, `demo`, que cria dez organizações, nove solicitantes, quatro contas de equipe, nove agendamentos e três chamados fictícios para testar o CRM. Entre as organizações estão empresas parceiras fictícias como ACATE Labs, Maré Sustentável e Ponte Digital, identificadas com `(DEMO)`; os agendamentos cobrem solicitações pendentes, confirmadas, diferentes espaços e uma visita guiada, sem sobreposição de horários. Os e-mails de teste terminam em `.test`. As contas abaixo são exclusivas para demonstração local; cada senha é codificada com BCrypt antes de ser gravada:

| Perfil | E-mail | Senha de demonstração |
|---|---|---|
| Coordenador inicial | `admin@inpetuhub.ufsc.br` | `InPetu-Admin-2026!` |
| Coordenadora de teste | `demo.coordenacao@inpetu.test` | `Coord-Demo-2026!` |
| Gestor de espaços | `demo.gestor@inpetu.test` | `Gestor-Demo-2026!` |
| Atendimento | `demo.atendimento@inpetu.test` | `Atende-Demo-2026!` |
| Solicitante · Laboratório Lagoa | `ana@laboratorio-lagoa.test` | `Ana-LabLagoa-2026!` |
| Solicitante · Governo/UFSC | `helena@governo-ufsc-demo.test` | `Helena-GovUFSC-2026!` |
| Solicitante · Cidade Criativa | `marcos@cidade-criativa.test` | `Marcos-Cidade-2026!` |
| Solicitante · Startup Ilha | `bianca@startup-ilha.test` | `Bianca-Startup-2026!` |
| Solicitante · ACATE Labs | `pedro@acate-labs-demo.test` | `Pedro-ACATE-2026!` |
| Solicitante · Maré Sustentável | `julia@mare-sustentavel-demo.test` | `Julia-Mare-2026!` |
| Solicitante · Ponte Digital | `lucas@ponte-digital-demo.test` | `Lucas-Ponte-2026!` |
| Solicitante · Cidade Laboratório | `marina@cidade-laboratorio-demo.test` | `Marina-Cidade-2026!` |
| Solicitante · Impacto Ilha | `andre@impacto-ilha-demo.test` | `Andre-Impacto-2026!` |

Essas senhas são credenciais públicas de teste, não segredos: use-as somente no banco local descartável do profile `demo`, nunca em produção ou em contas reais.

**Use apenas com um banco local de testes.** Por segurança, a carga bloqueia bancos não locais por padrão. Faça backup antes de usar qualquer banco com dados reais. O script `iniciar-inpetu.bat` inicia o banco padrão e não deve ser usado para este teste. Primeiro, pare o backend em execução com `Ctrl+C` na janela dele e confirme que a porta 8080 foi liberada. Mantenha o frontend/Vite aberto.

Antes, crie `inpetu_connect_demo` no HeidiSQL:

```sql
CREATE DATABASE IF NOT EXISTS inpetu_connect_demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Depois de criar o banco, abra um novo PowerShell na pasta do projeto e execute:

```powershell
.\iniciar-inpetu-demo.ps1
```

O script pede o usuário e a senha MySQL (os mesmos do HeidiSQL), aponta o backend diretamente para `inpetu_connect_demo`, gera um segredo JWT temporário e ativa o profile `demo`. Se o PowerShell bloquear a execução do arquivo, execute `Set-ExecutionPolicy -Scope Process Bypass` nessa janela e rode o script novamente. Mantenha essa janela aberta enquanto testa. Para confirmar que a API está no modo certo, `admin@inpetuhub.ufsc.br` deve aceitar `InPetu-Admin-2026!` e rejeitar `password`. Para sair do modo demonstração, pare o processo com `Ctrl+C` e inicie o backend padrão. A carga é idempotente: não duplica registros de demonstração existentes; também atualiza as senhas das contas listadas. Usuários e organizações com os mesmos e-mails/nomes são preservados. O script limita a conexão ao banco local; não o altere para produção.

As reservas são programadas para os próximos dias em relação à data da inicialização. As contas demonstrativas podem entrar no CRM/portal com as credenciais individuais listadas acima, e os chamados usam e-mails `.test` sem envio externo.

Uma visão geral do sistema, módulos, dados fictícios e roteiro de validação está no PDF `docs/InPETU-Connect-NotebookLM.pdf`, pronto para importar no NotebookLM.

## Deploy no Railway

Veja `DEPLOY-RAILWAY.md` (site + banco principal + banco de teste com seletor dentro do site).
