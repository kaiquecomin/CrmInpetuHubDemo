# Deploy no Railway (site + banco principal + banco de teste)

O site (React) e a API (Spring Boot) sobem juntos, em **um único serviço**, via `Dockerfile`.
Dentro do site há um seletor **Banco: Principal | Teste** (canto inferior esquerdo).

## 1. Subir o código
Envie esta pasta para um repositório no GitHub (o `.gitignore` já ignora `node_modules`, `target`, `.env`).

## 2. Criar o projeto no Railway
1. **New Project → Deploy from GitHub repo** e escolha o repositório. O Railway detecta o `Dockerfile` / `railway.json`.
2. No mesmo projeto: **+ New → Database → MySQL**. (Um MySQL só basta: ele hospeda os dois bancos.)

## 3. Variáveis do serviço do site (aba *Variables*)
Troque `MySQL` pelo nome real do serviço de banco, se for diferente.

| Variável | Valor |
|---|---|
| `JWT_SECRET` | texto aleatório com 48+ caracteres (obrigatório) |
| `DB_URL` | `jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_TEST_URL` | `jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/inpetu_teste?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8` |
| `APP_UPLOAD_DIR` | `/data/uploads` |

- `DB_TEST_USER` / `DB_TEST_PASSWORD` são opcionais (por padrão usam os mesmos do principal).
- `DB_TEST_SEED_DEMO=false` impede a carga de dados fictícios no banco de teste (padrão: `true`).
- Sem `DB_TEST_URL`, o seletor some e só o banco principal é usado.

## 4. Volume para imagens/anexos
O sistema grava fotos de espaços, logos e anexos em disco. No serviço do site: **Settings → Volumes → Add Volume**, mount path `/data`.
Sem volume, esses arquivos somem a cada novo deploy.

## 5. Domínio
**Settings → Networking → Generate Domain**. Abra o endereço: o seletor aparece no canto inferior esquerdo.

## Como o seletor funciona
- O site guarda a escolha no navegador e manda `X-Database: main|test` em toda chamada à API.
- O token de login é amarrado ao banco em que foi emitido: trocar de banco desloga, e um token de um banco não vale no outro.
- No banco de teste aparece uma faixa laranja "AMBIENTE DE TESTE".
- Na primeira subida, o banco de teste é criado, recebe as tabelas, os dados iniciais e (se `DB_TEST_SEED_DEMO` não for `false`) as contas/reservas fictícias de `DemoDataSeed`.
