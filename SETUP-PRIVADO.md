# Configuração de ambiente

O projeto usa Java 25 (JDK 25), Spring Boot 3, MySQL 8 e React 18/Vite.

Não armazene senhas, tokens ou valores reais neste arquivo ou no repositório.
Configure as variáveis diretamente no Railway ou em um gerenciador local de
segredos.

## Banco e autenticação

- `DB_URL` — URL JDBC do MySQL.
- `DB_USER` — usuário do banco.
- `DB_PASSWORD` — senha do banco; obrigatória. Sem ela, a inicialização deve
  falhar.
- `JWT_SECRET` — chave de assinatura JWT forte e exclusiva para o ambiente.
- `FRONTEND_ORIGIN` — origem permitida pelo CORS, sem `*`.

## Primeiro coordenador

Defina `APP_ADMIN_EMAIL` e `APP_ADMIN_PASSWORD` antes da primeira inicialização
em produção. A senha deve conter de 12 a 72 caracteres. O coordenador só é
criado se o banco ainda não tiver um usuário com perfil 1. Sem as duas variáveis,
nenhum coordenador é criado e a aplicação registra um aviso. Depois de confirmar
o acesso inicial, remova as variáveis do ambiente.

## Dados locais de demonstração

O perfil local `demo` requer `DEMO_ADMIN_PASSWORD` e as variáveis
`INPETU_DEMO_PASSWORD_*` que o script `scripts/start-local-demo.ps1` solicita.
Use uma senha diferente para cada conta; o script valida o intervalo de 12 a 72
caracteres e não imprime os valores.

`DB_TEST_PASSWORD` é uma variável legada. A aplicação atual usa um único banco
por implantação e não a consome nem oferece seletor de banco de teste. Remova
configurações antigas correspondentes do ambiente de hospedagem após verificar
se o recurso externo ainda é necessário.
