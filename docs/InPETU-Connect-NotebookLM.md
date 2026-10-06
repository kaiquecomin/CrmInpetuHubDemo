# InPETU Connect — guia de contexto e demonstração

**Documento para NotebookLM · 4 de outubro de 2026**

## Resumo do sistema

O InPETU Connect é um portal web e CRM para uso dos espaços do InPETU Hub, no Lote 73 do Sapiens Parque, em Florianópolis. O portal público permite consultar espaços e disponibilidade, solicitar reservas ou visitas guiadas e enviar chamados de suporte. A equipe usa o CRM para aprovar reservas, administrar espaços, responder chamados, gerenciar cadastros e consultar auditoria.

O produto não deve ser confundido com o site institucional do InPETU Hub: este sistema trata de acesso, reserva e atendimento dos espaços.

## Arquitetura

- **Interface:** React 18, Vite, Headless UI e Lucide.
- **API:** Java 25 e Spring Boot 3, REST sob `/api/v1`.
- **Persistência:** MySQL 8 via Spring Data JPA.
- **Autorização:** JWT stateless, perfis de Coordenador, Gestor de Espaços, Staff/Atendente e Solicitante.
- **Anexos:** PDFs, PNG e JPG até 10 MB em `uploads/inpetu`; produção deve usar armazenamento persistente.
- **Autenticação:** login JWT com e-mail e senha; senha armazenada com BCrypt. SMTP é opcional e usado para respostas e notificações.

### Principais dados

- Organização: instituição à qual pertencem os solicitantes.
- Usuário: pessoa com perfil, e-mail, organização e persona interna P1–P6.
- Espaço: ambiente reservável, capacidade, tipo, equipamentos e status.
- Reserva: solicitante, espaço, data, faixa de horário, finalidade e status.
- Chamado: e-mail de contato, mensagem, anexo opcional e resposta da equipe.
- Auditoria: ação administrativa, responsável, registro afetado e justificativa.

## Perfis e fluxos

| Perfil | Uso principal |
|---|---|
| Coordenador | Gerencia cadastros e equipe, classifica solicitantes, administra itens do site e acessa auditoria. |
| Gestor de Espaços | Gerencia espaços e analisa reservas. |
| Staff/Atendente | Atende chamados e consulta cadastros conforme permissões. |
| Solicitante | Consulta disponibilidade, solicita espaços e acompanha as próprias reservas. |

### Fluxo de reserva

1. Escolher tipo de espaço, data e horário disponível.
2. Informar finalidade e participantes, quando necessário.
3. Enviar a solicitação; o servidor bloqueia o espaço durante a validação e o primeiro pedido válido ocupa o intervalo enquanto aguarda análise.
4. O sistema valida horário, capacidade e cota mensal. Excedentes ficam pendentes e notificam a equipe para negociação antes da aprovação.
5. A equipe pode aprovar, editar ou cancelar com motivo; as alterações são auditadas.

P2 tem limite de 30 horas/mês, P3 de 20 horas, P4 de 10 horas e P5 de 10 horas. As horas não acumulam. P1 e P6 não têm limite indicado na tabela de referência. Reservas pendentes e confirmadas contam para o mês da data reservada; canceladas não contam. Visitas guiadas sempre dependem de confirmação da equipe.

### Fluxo de atendimento

1. O usuário envia uma dúvida pelo portal, podendo anexar PDF, PNG ou JPG.
2. A equipe visualiza o chamado no CRM e registra uma resposta.
3. Com SMTP habilitado, a resposta também pode ser enviada por e-mail.

### Fluxo de cadastro

A equipe pode criar um cadastro de organização e pessoa responsável. O usuário é criado como solicitante, fica aguardando a definição de persona e é incluído na auditoria. A equipe define ou atualiza personas P1–P6. E-mails duplicados são rejeitados. No cadastro público, o solicitante define uma senha; não há login por Magic Link.

## Dados de demonstração fictícios

Os registros abaixo são criados apenas ao iniciar o backend com o profile `demo`. Todos são sintéticos; os endereços `.test` são exemplos reservados e não devem receber e-mail real.

### Membros da equipe

| Nome | E-mail fictício | Perfil | Organização |
|---|---|---|---|
| Camila Nunes | `demo.coordenacao@inpetu.test` | Coordenador | UFSC / InPETU Hub |
| Rafael Martins | `demo.gestor@inpetu.test` | Gestor de Espaços | Laboratório Lagoa (Demonstração) |
| Lia Ferreira | `demo.atendimento@inpetu.test` | Staff/Atendente | Laboratório Lagoa (Demonstração) |

### Solicitantes e organizações

| Nome | E-mail fictício | Cargo | Organização | Persona inicial |
|---|---|---|---|---|
| Ana Souza | `ana@laboratorio-lagoa.test` | Pesquisadora | Laboratório Lagoa (Demonstração) | P3 |
| Marcos Lima | `marcos@cidade-criativa.test` | Coordenador de projetos | Cidade Criativa (Demonstração) | P3 |
| Bianca Costa | `bianca@startup-ilha.test` | Fundadora | Startup Ilha (Demonstração) | P3 |

Cada usuário demo recebe uma senha de teste própria, codificada com BCrypt antes de ser gravada. A lista dessas credenciais está no README; use-as somente no banco local descartável.

### Reservas fictícias

As datas são relativas ao dia em que o profile `demo` inicia.

| Atividade | Espaço | Data | Horário | Estado esperado |
|---|---|---:|---|---|
| Oficina de inovação aberta (DEMO) | Sala de Aula 1 | +2 dias | 09:00–11:00 | Pendente |
| Reunião do Laboratório Lagoa (DEMO) | Sala de Reunião 1 | +3 dias | 14:00–15:30 | Confirmada |
| Visita técnica à Startup Ilha (DEMO) | Visita Guiada | +5 dias | 10:00–11:30 | Pendente |

### Chamados fictícios

| Contato | Conteúdo | Estado esperado |
|---|---|---|
| Ana Souza | Pergunta sobre consultar disponibilidade de sala. | Pendente |
| Marcos Lima | Pedido de atualização de horário, com resposta demonstrativa já gravada. | Respondida |
| Bianca Costa | Pergunta sobre capacidade de visita guiada para 12 pessoas. | Pendente |

## Como importar a demonstração local

Use apenas um banco local de testes, separado de qualquer ambiente real. Faça backup antes de testar com dados que não sejam descartáveis. O carregamento não é executado no profile padrão.

No PowerShell, no terminal do backend:

```powershell
$env:SPRING_PROFILES_ACTIVE = "demo"
mvn spring-boot:run
```

O profile `demo` desativa o SMTP. A carga é idempotente e preserva organizações/usuários com os mesmos e-mails ou nomes. Por padrão, bloqueia URLs de banco que não sejam locais. Só habilite `DEMO_DATA_ALLOW_NON_LOCAL=true` depois de confirmar explicitamente que o banco escolhido é descartável e autorizado para demonstração.

Para voltar ao modo normal, pare o backend e inicie sem `SPRING_PROFILES_ACTIVE=demo`. A configuração fica no processo PowerShell atual; não use `setx` para persistir a senha.

## Roteiro sugerido para testar no CRM

1. Entre com o usuário de demonstração Coordenador e a senha temporária.
2. Em **Visão geral**, verifique os cartões de reservas pendentes e chamados abertos.
3. Em **Reservas**, aprove a oficina pendente ou revise a visita guiada.
4. Em **Atendimento**, responda um dos chamados pendentes e confirme o estado Respondida.
5. Em **Cadastros**, altere a persona de Ana, Marcos ou Bianca; teste também a criação de um cadastro com senha inicial.
6. Em **Auditoria**, confirme a atividade administrativa quando aplicável.
7. Entre com o usuário Gestor e valide o fluxo de aprovação de reserva.
8. Entre com o usuário Staff e valide a lista de chamados e o envio de resposta.
9. Entre como solicitante usando o e-mail e a senha individual listada no README e confira as reservas próprias.

## Validação técnica desta revisão

- `npm run build`: aprovado na última validação.
- `mvn test`: testes aprovados na última validação.
- Os testes verificam os fluxos de reservas, cotas, negociação, respostas de chamados, carga fictícia idempotente e bloqueio de banco remoto por padrão.

## Observações de operação

- `DB_URL`, `DB_USER` e `DB_PASSWORD` devem apontar para o ambiente de teste correto.
- `JWT_SECRET` deve ser aleatório, privado e estável em implantação; tokens existentes deixam de valer se a chave mudar.
- SMTP fica desligado por padrão; não configure credenciais SMTP no ambiente de demonstração.
- Não use contas, e-mails, reservas ou organizações fictícias em produção.
- A pasta de uploads requer retenção, backup e volume persistente em implantação real.
