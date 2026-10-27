# PROJETO INPETU CONNECT: ETAPA 6 (ÚLTIMA), PROMPT COMPLETO E AUTOSSUFICIENTE

Branch wip/responsividade. Sem commit, sem push, sem merge, sem editar src/main/resources/static.
Este arquivo contém TUDO que você precisa: regras, estado atual e as tarefas. Não edite este arquivo. Registre o progresso em .tsupgrader/progresso.md (sempre ACRESCENTANDO seções, nunca sobrescrevendo nem apagando o que já existe).

## COMO COMEÇAR

1. Leia este arquivo inteiro.
2. Se .tsupgrader/progresso.md NÃO existir (foi perdido numa sessão anterior), recrie-o agora, sem perguntar, a partir da seção "ESTADO ATUAL" abaixo. Para cada item marque: provado, parcial ou não provado, com o caminho da evidência quando existir em .tsupgrader/runtime-validation (capturas, JSONs, scripts manual-stage*). Se não houver evidência encontrável, escreva "registrado como provado na sessão anterior, sem arquivo de evidência" e NÃO repita a prova, a menos que eu peça. Se o arquivo existir, só acrescente uma seção "Etapa 6".
3. Confirme que .tsupgrader/ está no .gitignore.
4. Siga direto para a ENTREGA 0-A. Não faça perguntas que possam ser resolvidas lendo o código ou este arquivo. Pergunte somente se estiver realmente bloqueado, e em uma única pergunta objetiva.

## COMO TRABALHAR (vale para toda a Etapa 6)

1. Execute UMA entrega por vez. Ao terminar, entregue a tabela e PARE. Só comece a próxima quando eu escrever o comando indicado ("continuar 0-B", "continuar parte 1"). Não adiante itens de entregas futuras.
2. Só marque um item como concluído se funcionar em Chromium real, com backend NOVO e sessão limpa, acessando SEMPRE http://localhost:5173 (nunca 127.0.0.1, nunca 8080), com login real pela interface. Testes unitários e probes HTTP NÃO bastam e NÃO substituem a prova. Nunca use mock para fabricar um status.
3. Ferramenta de prova: script Playwright MANUAL em Node, com passos explícitos (page.goto, getByRole/getByLabel, click, fill, expect), Chromium instalado em .tsupgrader/runtime-validation, headless, sem gravação automática e sem CDP. Em cada passo registre page.on('response') com método, URL e status das chamadas /api, e salve screenshots em 390 / 824 / 1280 px, nos temas claro e escuro. Leia APP_ADMIN_EMAIL e APP_ADMIN_PASSWORD de process.env e NUNCA imprima senhas, códigos ou tokens. Se um passo falhar, mostre a mensagem exata, o passo e o log da requisição, e corrija a causa; não troque de método de prova.
4. Para cada item: (a) reproduza o defeito e registre a requisição que falha (método, URL, status, corpo, erro do console); (b) corrija a CAUSA RAIZ, não o sintoma; (c) repita o fluxo e anexe print + status 2xx. Se um item falhar, diga qual e por quê e NÃO avance.
5. Ambiente: mate processos nas portas 8080 e 5173; backend (JDK 25, mvn spring-boot:run) com Coordenador de teste (APP_ADMIN_EMAIL / APP_ADMIN_PASSWORD de 12+ caracteres), segredos de teste e MURAL_ENABLED=true; front com npm run dev -- --host localhost --port 5173 --strictPort. O banco local que o rundev usa é o inpetu_connect. NUNCA toque em inpetu_connect_demo, inpetu_connect_runtime_test nem em outros bancos.
6. Railway SOMENTE LEITURA: informe só NOMES de variáveis (nunca valores) e logs. Qualquer mudança no Railway fica apenas LISTADA no relatório, nunca aplicada.
7. Regras de design do projeto: fonte Montserrat, sem travessão no meio de frase, emoji em todo título, sem eyebrows (textos pequenos acima de títulos e barrinhas coloridas decorativas). O tema escuro do painel está APROVADO e não deve ser alterado, só corrigido onde indicado.
8. Entrega de cada etapa: tabela item | fluxo executado | status HTTP | print (390 / 824 / 1280 px; claro e escuro), resultado de mvn test e npm test, e lista honesta do que não passou, com causa e log. Linha de base atual dos testes: mvn test 144 passando, npm test 24 passando. Se o número cair, explique qual teste saiu.
9. O código do Mural NUNCA vai para o Git: ele vive só em src/mural/, src/main/java/com/inpetu/connect/mural/, src/test/java/com/inpetu/connect/mural/ e uploads/mural/ (todos no .gitignore). Código tracked nunca importa nada de lá. Os cinco arquivos antigos do Mural já foram tirados do índice com git rm --cached e estão staged: não os mexa. Sempre teste com MURAL_ENABLED=true e false.
10. Nunca cole nem sobrescreva por cima de arquivos existentes; para textos novos crie arquivos novos.

## ESTADO ATUAL (resumo das etapas 1 a 5, para reconstruir o progresso.md se preciso)

Etapa 1, fundação e sessão:
- 1.1 script Playwright manual com login real e captura de status: PROVADO.
- 1.2 relatório do Railway: FEITO por outro canal (somente leitura). Variáveis presentes no serviço CrmInpetuhub: DB_URL, DB_USER, DB_PASSWORD, JWT_SECRET, OTP_SECRET, APP_RATE_LIMIT_SECRET, APP_ADMIN_EMAIL, APP_ADMIN_PASSWORD, APP_PUBLIC_URL, FRONTEND_ORIGIN, BREVO_API_KEY, MAIL_ENABLED, MAIL_FROM, MAIL_REPLY_TO. Ausentes: APP_UPLOAD_DIR, variável de cookie Secure. MURAL_ENABLED não está definida (correto). Só o MySQL tem volume (mysql-volume, 500 MB); o serviço da aplicação NÃO tem volume, então uploads somem a cada deploy. Em 7 dias: 161.906 requisições, 4xx = 104, 5xx = 39; os 502 vistos são da troca de deploy (15/10 00:39); login 401 x5 e 429 x4 em 15/10; 404 em /paineladm, /favicon.ico e /robots.txt.
- 1.3 sessão (401 JSON, cookie Secure configurável, vite em localhost): PROVADO.
- 1.4 novo cadastro no painel: PROVADO (POST /usuarios/cadastros 200).
- 1.5 espaços (DTO, PUT /espacos/{id}, bootstrap sem sobrescrever, indisponível com motivo, persistência após reiniciar): PROVADO.

Etapa 2, Mural isolado: PROVADO (GET /config devolve mural true/false; flag desligada gera 404 nas sete rotas; arquivos antigos fora do índice; clone limpo com mvn -DskipTests package em BUILD SUCCESS). Lacuna: npm run build e npm test no clone limpo não foram confirmados, e o teste de contagem caiu de 142 para 141 sem explicação (verificar na Parte final).

Etapa 3 (itens D a F): E (hero com imagem fixa) e F (seleção de espaço e foco por teclado) PROVADOS. D (reserva e recuperação de rascunho após login): PARCIAL; não foi possível provocar um 403 real em POST /reservas (o backend não restringe por perfil). Overflow da tabela de reservas em 390 px corrigido em reference.css.

Etapa 4 (itens G a J): PROVADOS (tokens e tema claro/escuro do PAINEL, perfil "Coordenador", gaveta mobile, Termos e Privacidade, regressão). Contraste medido: 4,66:1 no claro e 8,11:1 no escuro, mas essa medição NÃO cobriu botões e títulos de modais. O tema escuro existe só no painel, NÃO no site público.

Etapa 5 (item L e polimento visual):
- L recuperação de senha por código: PROVADO (202/202 para e-mail existente e inexistente; 202 e depois 429; validação 400/200/400; redefinição 200; novo login 200; replay do código antigo rejeitado).
- Polimento: 10 modais verificados em claro e escuro, em 390/824/1280 px (campos mínimo 13 px). Formulários provados: criar cadastro de organização 200, editar dados do cliente e persona P4 200, adicionar espaço com foto 200, reserva acima da cota com negociação e aprovação 200, compartilhar no Mural 200.
- "Personalizar local" e "Personalizados": não existem como telas com esse nome; o pedido se refere, provavelmente, aos modais Adicionar espaço e Editar espaço (fotos e capa), que estão provados.
- Bug de produção corrigido no código local: POST /reservas dava 500 (Data truncation na coluna notificacao.mensagem). Correção parcial já feita: truncamento seguro no NotificacaoService (a causa raiz está no item 0.7).

Parte 0 da Etapa 6, situação ao encerrar a sessão anterior:
- 0.6: limites (3 pedidos por hora por e-mail, 10 por hora por IP, 5 tentativas por código), cabeçalho Retry-After: 3600 no 429 (CORS expõe o cabeçalho), mensagem na tela, server.forward-headers-strategy=framework, testes ClientIpResolverTest, PasswordResetServiceTest e request.test.js: JÁ ENTREGUES. Pendentes: A, B e C (abaixo).
- 0.7: truncamento seguro (título 150, mensagem 255 caracteres) e NotificacaoServiceTest: JÁ ENTREGUES. Pendente: causa raiz.
- 0.8 (código de saída 1 do wrapper de inicialização veio do encerramento externo do Maven, exit code -1): RESOLVIDO, nenhuma ação.
- 0.1 a 0.5 e 0.9: NÃO FEITOS.

## PARTE 0: CORREÇÕES, EM DUAS ENTREGAS

### ENTREGA 0-A (comece por aqui): 0.7, 0.6 (A, B, C), 0.3 e 0.9

0.7 Tamanho da coluna de notificação (causa raiz)
- Fato confirmado no MySQL local: notificacao.mensagem é TINYTEXT (limite de 255 BYTES), criada pelo @Lob sem tamanho; titulo é VARCHAR(150). Em UTF-8 com acentos, 255 caracteres excedem 255 bytes, então o truncamento por caracteres não basta.
- Troque @Lob por @Column(length = 1000) na mensagem. Mantenha o truncamento seguro no NotificacaoService, agora em 500 caracteres na mensagem e 150 no título, sem cortar no meio de um caractere Unicode (emoji incluído).
- Escreva .tsupgrader/sql/ampliar-notificacao.sql com ALTER TABLE notificacao MODIFY COLUMN mensagem VARCHAR(1000), preservando NOT NULL se a coluna atual for NOT NULL. O arquivo NÃO pode ter nome de banco fixo (sem USE e sem "inpetu_connect." antes da tabela), porque no Railway o banco tem outro nome. Não aplique no Railway.
- Aplique SOMENTE no MySQL local, no banco inpetu_connect. Como ddl-auto=update não altera colunas existentes, o ALTER manual é obrigatório.
- Prova em Chromium: reserva com título de 300 caracteres com acentos e emoji, que excede a cota, retornando 200, e a notificação aparecendo inteira ou truncada com reticências. Teste de regressão com mensagem de 500 caracteres só com letras acentuadas.

0.6 Recuperação de senha e limite (pendências A, B e C)
- A: prove com teste que um cliente que envia seu próprio X-Forwarded-For (IPs diferentes a cada pedido) NÃO escapa do limite de 10 pedidos por hora por IP. O IP usado deve ser o que o proxy da plataforma acrescenta (nunca o primeiro valor enviado pelo cliente). Informe qual valor do cabeçalho é lido e por quê. Se hoje for possível falsificar, corrija (lista TRUSTED_PROXIES ou equivalente).
- B: reinicie o backend e prove em Chromium um 429 REAL na recuperação de senha (use e-mails novos para esgotar os 3 pedidos por hora), mostrando o status 429, o Retry-After chegando ao navegador e a mensagem com o tempo na tela. Sem simulação.
- C: confirme que o mesmo resolvedor de IP é usado por TODOS os limitadores (login, cadastro, recuperação de senha etc.).

0.3 Site "cai" ao apagar com Backspace
- Reproduza em cada campo de texto, número, telefone, data e hora dos modais e formulários (Editar reserva, Adicionar espaço, Criar cadastro, Meu perfil etc.). Registre o erro de console, o componente e o campo que derruba a tela.
- Corrija a causa raiz (campo controlado que vira string vazia ou NaN, parse de número, máscara de telefone, ou atalho global que captura o Backspace). Campos vazios devem mostrar o placeholder e a validação normal.
- Adicione um error boundary no painel e no site público, com mensagem e botão "Tentar de novo".
- Prove com teste em Chromium (apagar cada campo com Backspace sem erro de console) e adicione teste de regressão.

0.9 Rota do painel
- Faça /paineladm abrir o painel administrativo, com fallback das rotas do React no Spring (forward para index.html) para que recarregar qualquer rota do site não dê 404. Prove em Chromium com recarga em /paineladm, /mural (com a flag ligada) e uma rota inexistente (deve mostrar a página "não encontrada" do app, não o erro do servidor). Nada tracked importa o Mural.

Entrega da 0-A: tabela item | fluxo | status HTTP | prints, mvn test, npm test, lista honesta do que não passou. PARE e espere "continuar 0-B".

### ENTREGA 0-B (somente após "continuar 0-B"): 0.2, 0.1, 0.4 e 0.5

0.2 Select de persona na ficha do cliente
- O campo "Classificação" (persona) não abre a lista e a seta aparece fora do lugar, abaixo do campo. Reproduza (clique, Enter, Espaço, setas) e registre a causa raiz (por exemplo, overflow cortando a lista dentro do modal, z-index, pointer-events, select escondido).
- Corrija: a lista abre por cima do modal, com todas as personas, navegação por teclado e a seta dentro do campo, à direita. Prove escolhendo outra persona, salvando em "Salvar persona" (2xx) e reabrindo a ficha com o valor novo.

0.1 Contraste nos modais (claro e escuro)
- Botões azul claro com texto branco são difíceis de ver (Salvar alterações, Editar dados, Redefinir senha, Salvar persona, botão de fechar). No escuro use azul mais forte com texto branco, ou azul claro com texto azul-marinho. Nunca texto claro sobre fundo claro. Botões desabilitados mantêm o texto legível.
- Títulos invisíveis (texto escuro sobre fundo escuro) em "Editar reserva" e "Ficha do cliente". Corrija o título de TODOS os modais pelos tokens do tema.
- Meu perfil no escuro: a barra do título está branca, e o painel "Alterar senha" e os campos estão brancos com rótulos em azul claro. Use fundo e campos escuros do tema, com rótulos legíveis.
- Meça de novo o contraste de TODOS os textos e botões de TODOS os modais, nos dois temas, e entregue as razões. Mínimo 4,5:1 para texto e 3:1 para bordas de campos e ícones.

0.4 Modo noturno no site público
- Hoje só o painel tem tema escuro (o item G da Etapa 4 era só do painel). Leve o tema ao site público: início (hero, busca, filtros, cards de espaços), calendário completo, Minhas reservas, Meu perfil, Fale Conosco, Termos, Privacidade e todos os modais públicos (consultar horários, solicitar reserva, galeria "Ver foto"), inclusive o menu do usuário (Meu perfil, Minhas reservas, Painel da equipe, Sair da conta).
- Reaproveite os tokens da Etapa 4 (variáveis CSS compartilhadas), sem duplicar cores. O Mural usa os mesmos tokens dentro de src/mural/, sem referência a ele fora da pasta.
- Botão de alternar tema no cabeçalho público, com o mesmo comportamento do painel e a MESMA chave salva (o tema vale nos dois lados). Sem escolha salva, siga prefers-color-scheme. Sem "piscada" de tema claro ao carregar: aplique o tema antes da primeira renderização.
- O hero já é azul escuro: no tema escuro precisa continuar legível, sem ficar igual ao fundo. Fotos de espaços não são escurecidas, só ganham borda sutil.
- Contraste 4,5:1 (texto) e 3:1 (bordas e ícones), medido em todas as páginas e modais públicos, nos dois temas.
- Prova: alternar pelo botão, recarregar, confirmar que o tema persiste; navegar por todas as páginas e modais públicos nos dois temas, em 390 / 824 / 1280 px, sem erro de console.

0.5 Topo do site público
- O cabeçalho aparece cortado no topo (logo, menu e nome do usuário pela metade) e, no print enviado, a busca do hero ("Tipo de espaço / Data desejada / Consultar horários" e os números do hero) aparece por cima do terceiro card de espaço. Pode ser efeito de captura de página inteira com elemento fixo ou sticky: confirme em 390 / 824 / 1280 px com scroll no topo e no meio da página. Se for real, corrija o empilhamento (z-index e posição) e prove.
- Remova os eyebrows: "EXPLORE POR TIPO" acima dos filtros e as barrinhas coloridas acima dos títulos.

Entrega da 0-B: tabela com prova de cada item, mvn test, npm test, lista honesta. PARE e espere "continuar parte 1".

## PARTE 1: ATENDIMENTO POR TICKETS COM CONVERSA (somente após "continuar parte 1")

Objetivo: no lugar de contato por e-mail, uma conversa dentro do site, no estilo ticket de Discord e chat de banco. Evolua a entidade e a tela de Atendimento (dúvidas) que já existem, sem sistema paralelo. Use os tokens, os modais e o tema escuro (painel e site público) já entregues. O código dos tickets é tracked e NÃO pode importar nada do Mural.

Modelo
1. Ticket: assunto, categoria (reserva, cadastro, espaço, outro), status (Aberto, Em atendimento, Aguardando cliente, Resolvido, Fechado), solicitante, atendente responsável, prioridade, datas.
2. Mensagem: ticket, autor (cliente ou equipe), texto, anexos opcionais (JPG, PNG, WebP e PDF, até 5 MB), data e leitura.
3. Nota interna da equipe, invisível para o cliente.
4. Se criar tabelas ou alterar colunas, escreva o SQL em .tsupgrader/sql/ SEM nome de banco fixo e liste o que precisa rodar no Railway (sem aplicar). Colunas de texto longo usam VARCHAR ou TEXT com tamanho explícito, NUNCA @Lob sem tamanho (foi isso que causou o erro 500 em notificações).

Cliente (site público, logado)
5. Botão "Falar com a equipe" que abre um ticket (assunto, categoria, mensagem) e depois uma janela de conversa com balões, anexos e indicador de não lida.
6. Lista "Meus atendimentos" com status e última mensagem.
7. Visitante sem login: formulário simples que cria o ticket e envia por e-mail um link de acompanhamento com token de uso restrito.

Equipe (painel)
8. Caixa de entrada com filtros por status, categoria e responsável, contador de não lidas, assumir ticket, mudar status e responder.
9. Respostas rápidas salvas. Permissões pelo RBAC existente: Coordenador vê tudo; Atendente vê os seus e os sem responsável.
10. Auditoria da abertura, troca de status e fechamento.

Tempo real e avisos
11. Polling curto (3 a 5 s com a conversa aberta, 30 s fora dela), reaproveitando as notificações. Sem WebSocket nesta etapa.
12. Notificação dentro do site ao chegar resposta (tipo TICKET, usando o truncamento seguro do NotificacaoService). O e-mail é só um aviso opcional, nunca o canal principal.

Segurança
13. Cliente só acessa os próprios tickets (prove com dois usuários: 403 ou 404 ao abrir o ticket do outro, também no download de anexo). Limite de tamanho de mensagem e de envios por minuto usando o resolvedor de IP compartilhado. Sanitização do texto (sem HTML) e validação do tipo e tamanho do arquivo no backend. O nome do arquivo salvo nunca vem do cliente.
14. Os anexos ficam no diretório de uploads configurável (APP_UPLOAD_DIR), fora da pasta estática pública, servidos só por endpoint autenticado.

Prova em Chromium (mesmo método), fluxo mínimo
15. Cliente abre ticket com anexo; equipe vê na caixa de entrada, assume e responde; cliente vê a resposta sem recarregar; equipe marca como resolvido e depois fecha; cliente tenta abrir ticket de outro usuário e é bloqueado. Claro e escuro, 390 / 824 / 1280 px, com status HTTP de cada passo. Teste com MURAL_ENABLED=true e false.

Entrega da Parte 1: tabela, mvn test, npm test, lista honesta. PARE e espere "continuar fechamento final".

## FECHAMENTO FINAL (somente após "continuar fechamento final")

16. Regressão completa com login real, Mural ligado e desligado: sessão, cadastros, espaços (criar, editar, fotos, indisponível), reservas e negociação, recuperação de senha, perfil, Atendimento e tickets, Auditoria, notificações, Termos e Privacidade, tema claro e escuro no painel e no site público. Sem erro de console e com status 2xx.
17. Prova do clone limpo: git clone --no-hardlinks . /tmp/clean (ou cópia dos arquivos rastreados, se não houver commit), SEM src/mural, SEM o pacote mural e SEM .tsupgrader. Nele rode mvn -DskipTests package, npm run build e npm test. git ls-files | grep -i mural deve voltar vazio. Explique também por que mvn test foi de 142 para 141 na Etapa 2.
18. Escreva o relatório final em .tsupgrader/relatorio-final.md com: (a) lista de arquivos alterados por etapa; (b) lista do que o usuário precisa fazer no Railway, SEM aplicar, nesta ordem: 1) rodar a consulta de verificação em INFORMATION_SCHEMA.COLUMNS para notificacao (titulo e mensagem) no MySQL de produção; 2) rodar os arquivos .sql de .tsupgrader/sql no MySQL de produção ANTES do deploy (alargar a coluna é seguro; se o deploy sair antes, o código novo tenta gravar mensagens de até 500 caracteres numa coluna ainda TINYTEXT); 3) criar volume no serviço da aplicação e definir APP_UPLOAD_DIR para o caminho do volume; 4) definir a variável do cookie Secure como true; 5) confirmar que MURAL_ENABLED continua ausente; 6) depois do deploy, verificar nos logs HTTP que não há 5xx em /api/v1/reservas e que os IPs observados nos limitadores diferem entre clientes; (c) o que não passou, com causa e log.
Sem commit, push ou merge. Pare com a tabela final.
