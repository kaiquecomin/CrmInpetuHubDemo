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

| Variável | Obrigatória | Onde é usada |
|---|---|---|
| `PORT` | Não; plataforma Railway | Porta HTTP (`server.port`), padrão `8080` |
| `DB_URL` | Para banco remoto | URL JDBC MySQL; padrão local em `application.properties` |
| `DB_USER` | Não; padrão `root` local | Usuário de `spring.datasource` |
| `DB_PASSWORD` | Sim | Senha de `spring.datasource` |
| `JWT_SECRET` | Sim | Chave de assinatura JWT; `JwtService` |
| `JWT_EXPIRATION_MS` | Não | Validade JWT; padrão 8 horas |
| `OTP_SECRET` | Sim | Segredo HMAC dos códigos OTP; cadastro e `OtpSecretValidator` |
| `APP_RATE_LIMIT_SECRET` | Sim, exceto `dev` sem e-mail habilitado | Hashes dos limites por IP/e-mail; validado por `RateLimitSecretValidator` |
| `LOGIN_MAX_ATTEMPTS` | Não | Tentativas de login; padrão `5` |
| `LOGIN_LOCK_DURATION_SECONDS` | Não | Bloqueio após tentativas; padrão `900` segundos |
| `TRUSTED_PROXIES` | Não | IPs de proxy confiáveis usados para resolver IP cliente |
| `APP_ADMIN_EMAIL` | Condicional | E-mail do primeiro Coordenador criado pelo bootstrap |
| `APP_ADMIN_PASSWORD` | Condicional | Senha do primeiro Coordenador criado pelo bootstrap |
| `APP_UPLOAD_DIR` | Não | Diretório de anexos de dúvidas e imagens; padrão `uploads/inpetu` |
| `FRONTEND_ORIGIN` | Não | Origens CORS; padrão `http://localhost:5173` |
| `MAIL_ENABLED` | Não | Ativa todos os envios transacionais por Brevo (códigos, respostas e notificações) |
| `BREVO_API_KEY` | Quando `MAIL_ENABLED=true` | Chave enviada ao endpoint transacional da API Brevo |
| `MAIL_FROM` | Quando `MAIL_ENABLED=true` | Remetente verificado no Brevo |
| `MAIL_REPLY_TO` | Não | Reply-to enviado nas mensagens do Brevo |
| `APP_PUBLIC_URL` | Para o link legado de confirmação | Base da URL no link `/confirmar`; OTP usa o código |
| `APP_DEMO_ADMIN_EMAIL` | Perfis locais `dev,demo` | Sobrescreve o e-mail administrativo de demonstração; padrão `admin@inpetu.test` |
| `DEMO_ADMIN_PASSWORD` | Perfis locais `dev,demo` | Senha da conta de demonstração `admin@inpetu.test` |
| `INPETU_DEMO_PASSWORD_*` | Perfis locais `dev,demo` | Senhas distintas por conta; o sufixo é a chave da conta, em maiúsculas |
| `VITE_API_URL` | Não | URL da API incorporada ao frontend Vite durante o build; padrão do código local |
| `JAVA_TOOL_OPTIONS` | Não | Opções da JVM; definida no estágio final do Dockerfile |

`APP_ADMIN_EMAIL` e `APP_ADMIN_PASSWORD` criam o primeiro coordenador apenas uma vez, se ainda não existir nenhum usuário com perfil 1. Sem elas, a aplicação registra um aviso e não cria conta administrativa; não há credenciais padrão. Não alteram nem removem contas existentes. Remova essas duas variáveis depois de confirmar o acesso. `OTP_SECRET` deve ser um segredo aleatório, estável entre deploys e distinto de `JWT_SECRET`; a aplicação não inicia sem ele. `APP_RATE_LIMIT_SECRET` também deve ser aleatório, estável entre deploys e distinto dos demais segredos. Para habilitar qualquer envio, defina `MAIL_ENABLED=true` e configure `BREVO_API_KEY` e `MAIL_FROM` com remetente validado no Brevo.

Os envios de código, resposta de dúvida e notificação compartilham o cliente HTTP do Brevo; o transporte e a dependência de e-mail SMTP foram removidos. Para resolver IPs atrás de um proxy, `TRUSTED_PROXIES` aceita uma lista separada por vírgulas de endereços IP exatos (não CIDRs). Vazio é o comportamento seguro padrão: ignora `X-Forwarded-For` e usa o endereço remoto visto pela aplicação.

No Railway, a documentação pública consultada descreve a rede de borda, mas não publica uma lista estável de IPs de proxy de origem nem uma garantia contratual de como o `X-Forwarded-For` é saneado antes de chegar ao serviço. Portanto, não há um valor universal seguro a recomendar para `TRUSTED_PROXIES`; não use `*` nem confie em IPs extraídos do próprio cabeçalho. Deixe a variável vazia até obter da Railway um endereço/CIDR de origem estável e uma confirmação de que o proxy remove ou acrescenta os cabeçalhos de forma confiável. Sem isso, o limite por IP contará o IP remoto do proxy, não o IP individual do cliente.

`DB_TEST_PASSWORD` é legado e não é consumido: cada implantação usa um único banco, sem seletor de banco de teste. A aplicação exige `DB_PASSWORD` sem valor padrão. Veja [.env.example](./.env.example) para os nomes, todos sem valores.

## Implantação no Railway

1. Conecte o repositório a um projeto no Railway e adicione um serviço MySQL.
2. Defina as variáveis acima no serviço da aplicação, referenciando as credenciais do MySQL.
3. Crie um volume persistente para os uploads e aponte `APP_UPLOAD_DIR` para ele. Sem volume, anexos e imagens são perdidos a cada novo deploy.
4. Gere o domínio em **Settings → Networking**.

O healthcheck usa `/api/v1/database`.

## E-mail e anexos

O cadastro público envia código de confirmação pelo Brevo. Os e-mails usam HTML e versão texto em `src/main/resources/templates/email`; a validade exibida vem da configuração do fluxo OTP. Respostas às dúvidas e notificações usam o mesmo cliente Brevo e os mesmos templates visuais. O preview com dados fictícios fica disponível em `/api/v1/dev/email-preview` somente quando o perfil Spring `dev` estiver ativo.

Anexos PDF, PNG e JPG de até 10 MB e imagens enviadas pela equipe (PNG/JPG de até 5 MB) são armazenados em disco no servidor. As 18 fotos oficiais do catálogo são imagens JPG otimizadas, empacotadas no build e servidas pela própria aplicação; não dependem de volume nem de URL externa. O nome numerado dos arquivos identifica a sala: a primeira imagem de cada grupo é a capa e as demais aparecem na galeria da mesma sala.

## Alterações de acesso e validação manual

O projeto não usa Flyway nem Liquibase. O schema é atualizado pelo Hibernate (`spring.jpa.hibernate.ddl-auto=update`): são aditivas as colunas `codigo_hash`, `codigo_expira_em` e `tentativas` de `cadastro_pendente` (o campo `ultimo_envio_em` é reutilizado), as colunas `senha_temporaria` e `versao_token` de `usuario` e a nova tabela `usuario_foto`. Não há migração SQL versionada nem operação intencional de remoção/renomeação de coluna. Antes do deploy com o MySQL real, faça backup, valide a atualização em uma cópia/staging e confirme a criação dessas colunas/tabela; não altere `ddl-auto` nem rode scripts destrutivos.

Após configurar as variáveis do Railway, valide em staging:

1. **Cadastro/OTP:** solicite cadastro com e-mail de teste, abra `/verificar-email`, confirme o código recebido e confira que o login automático redireciona para o portal. Abra também `/confirmar?token=teste` diretamente: a aplicação React deve carregar, em vez da Whitelabel 404 (o token de teste será recusado). Teste código errado cinco vezes, expiração após 10 minutos, reenvio após 60 segundos e o limite de reenvios por e-mail/IP. Simule falha do Brevo e confira a mensagem de erro e a opção de reenviar.
2. **Entrada e portal:** acesse uma página protegida antes do login e confirme que, após autenticar, volta apenas a uma rota interna permitida. Sem destino anterior, solicitantes devem ir ao portal e a equipe ao painel.
3. **Perfil/foto:** altere nome, telefone, organização e vínculo; confirme que e-mail, perfil e persona são somente leitura. Envie JPG/PNG/WebP válido de até 2 MB, confira o avatar, remova a foto e valide a rejeição de tipo/conteúdo incompatível e arquivo grande.
4. **Senha temporária:** como Coordenador, redefina a senha de um usuário permitido e copie a senha exibida uma única vez. Confirme que tokens anteriores são invalidados, que o login com senha temporária exige troca e que APIs ficam bloqueadas até a nova senha ser salva.
5. **Persona e telas:** altere a persona em um cadastro de teste, valide a confirmação quando a cota muda e navegue pelo seletor com teclado. Confira ficha, modais e portal em largura móvel.
6. **E-mails:** com perfil `dev` ativo, abra `/api/v1/dev/email-preview` para conferir os dois modelos. Em staging, confirme recebimento do código HTML e teste também a alternativa de texto do e-mail.

Execute a suíte automatizada do backend com `mvn test` e valide o frontend com `npm run build`.

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