# Acessos locais e cadastro no Passbolt

Este guia não contém senhas. Cadastre os segredos diretamente no Passbolt e use o script local para informá-los sem imprimi-los no terminal ou salvá-los no repositório.

## Como organizar os itens no Passbolt

Crie um item separado para cada conta abaixo. Use um título como `[LOCAL] InPETU Connect — <e-mail>`, o e-mail indicado como usuário e `http://localhost:5173` como URL. Gere uma senha aleatória, exclusiva e com pelo menos 20 caracteres para cada conta. Não reutilize senhas de produção.

| Conta local | Perfil | Variável solicitada pelo script |
| --- | --- | --- |
| `admin@inpetu.test` | Coordenador local | `INPETU_DEMO_PASSWORD_ADMIN` |
| `demo.coordenacao@inpetu.test` | Coordenadora de demonstração | `INPETU_DEMO_PASSWORD_COORDINATOR` |
| `demo.gestor@inpetu.test` | Gestor de espaços | `INPETU_DEMO_PASSWORD_MANAGER` |
| `demo.atendimento@inpetu.test` | Staff/atendimento | `INPETU_DEMO_PASSWORD_STAFF` |
| `ana@laboratorio-lagoa.test` | Solicitante de laboratório fictício | `INPETU_DEMO_PASSWORD_CUSTOMER_LABORATORY` |
| `helena@governo-ufsc-demo.test` | Solicitante de governo fictício | `INPETU_DEMO_PASSWORD_CUSTOMER_GOVERNMENT` |
| `marcos@cidade-criativa.test` | Solicitante de empresa fictícia | `INPETU_DEMO_PASSWORD_CUSTOMER_CITY_CREATIVE` |
| `bianca@startup-ilha.test` | Solicitante de startup fictícia | `INPETU_DEMO_PASSWORD_CUSTOMER_STARTUP_ISLAND` |
| `pedro@acate-labs-demo.test` | Solicitante de empresa fictícia | `INPETU_DEMO_PASSWORD_CUSTOMER_ACATE` |
| `julia@mare-sustentavel-demo.test` | Solicitante de organização fictícia | `INPETU_DEMO_PASSWORD_CUSTOMER_MARE` |
| `lucas@ponte-digital-demo.test` | Solicitante de empresa fictícia | `INPETU_DEMO_PASSWORD_CUSTOMER_PONTE` |
| `marina@cidade-laboratorio-demo.test` | Solicitante de laboratório fictício | `INPETU_DEMO_PASSWORD_CUSTOMER_CIDADE_LABORATORIO` |
| `andre@impacto-ilha-demo.test` | Solicitante de organização fictícia | `INPETU_DEMO_PASSWORD_CUSTOMER_IMPACTO` |

Os endereços `.test` são identidades sintéticas para uso local, não recebem e-mail e não representam pessoas ou organizações reais. As empresas, reservas e chamados de demonstração também são fictícios.

## Iniciar o ambiente de demonstração

1. Inicie o MySQL local e disponibilize o banco `inpetu_connect`.
2. Execute `.\scripts\start-local-demo.ps1` no PowerShell. O script solicita a senha do MySQL e, depois, cada senha do Passbolt sem exibir os caracteres.
3. Em outro terminal, execute `npm run dev` e abra `http://localhost:5173`.
4. Ao encerrar a API, o script restaura as variáveis de ambiente anteriores. A chave JWT local é aleatória e temporária; sessões locais deixam de valer após reiniciar a API.

O perfil `demo` valida que a URL JDBC aponta para `localhost`, `127.0.0.1` ou `::1` ao criar o `DataSource`, antes da inicialização do Hibernate e da execução de SQL. Ele não permite desativar essa proteção por variável de ambiente. A API e o Vite locais são vinculados a loopback e não ficam expostos à rede.

## Credenciais do primeiro coordenador em produção

Se uma implantação estiver conectada a um banco novo, crie um item separado no Passbolt para o coordenador de produção. Configure `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no ambiente hospedado para a primeira inicialização, confirme o login e então remova essas duas variáveis. O bootstrap só cria a conta se o e-mail ainda não existir; ele não redefine a senha nem modifica uma conta existente.

Não reutilize a credencial local `admin@inpetu.test` em produção. Em bancos já usados, confira as contas de equipe existentes e faça a redefinição de senha pelo procedimento administrativo adequado. Remover o seed de código não apaga os registros já persistidos.

## Encerramento do banco de teste hospedado

A aplicação não seleciona mais um segundo banco e não usa `DB_TEST_URL`, `DB_TEST_USER`, `DB_TEST_PASSWORD` ou `DB_TEST_SEED_DEMO`. Antes de excluir o recurso antigo na hospedagem, exporte um backup, confira se há dados que precisam ser preservados e retire essas variáveis do ambiente de produção. A mudança no código não executa `DROP DATABASE` nem remove recursos da hospedagem.
