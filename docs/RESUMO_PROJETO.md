# MarmitaTech Pro — Resumo do Projeto DevOps (Guia de Apresentação)

> Restaurante Planalto · CEUB · Sistema de gestão de marmitas
> Node.js 18 + Express + MySQL 8 + Docker + GitHub Actions

---

## 1. Visão geral — o que foi entregue

As **10 issues** do projeto foram concluídas (todas fechadas no GitHub), cobrindo as 4 dimensões de DevOps que o professor ensina: **Governança**, **CI**, **CD/Deploy** e **DevSecOps**.

| # | Issue | Entrega | Status |
|---|-------|---------|--------|
| 01 | GitHub Flow + Branch Protection | `main` protegida (PR obrigatório, push direto bloqueado, required checks) | ✅ |
| 02 | SCA + Dependabot | Dependabot ativo + 12 vulnerabilidades → **0** | ✅ |
| 03 | CI — Validação de Build Docker | Job `docker_build` em todo PR (required check) | ✅ |
| 04 | Hashing de senhas (BCrypt) | Login com `bcrypt.compare`; hash no banco | ✅ |
| 05 | SQL Injection + Validação | Prepared statements + validação (erro 400) | ✅ |
| 06 | Módulo de Pedidos | `POST /orders`, status inicial "Aberto" | ✅ |
| 07 | Kanban da Cozinha | 4 colunas + avanço de status (`UPDATE`) | ✅ |
| 08 | Relatório CSV | `GET /admin/export` (abre no Excel) | ✅ |
| 09 | Toasts + Mobile | Feedback visual + responsivo 375px | ✅ |
| 10 | Otimização Docker | Multi-stage alpine: 1.69GB → **196MB (-88%)** | ✅ |

---

## 2. Como rodar e demonstrar ao vivo

### Local (desenvolvimento)
```bash
docker compose -f docker-compose.dev.yml up --build
# App: http://localhost:3000   |   Login: admin / admin123
```

### Roteiro de demonstração
1. **Login** (`/`) → admin / admin123 → mostra **bcrypt** (senha errada = "Login Inválido").
2. **Dashboard** → cadastrar marmita (com preço) → **toast** de sucesso.
3. **Validação** → tentar preço negativo → **erro 400** (issue #05).
4. **Novo pedido** → seleciona marmita → aparece no **Kanban** coluna "Aberto".
5. **Kanban** → botão "Avançar →" move Aberto → Cozinha → Entrega → Entregue.
6. **Relatório** → "Baixar Relatório (CSV)" → abre no Excel com data e valor.
7. **Mobile** → DevTools 375px → tudo operável (Kanban com scroll horizontal).
8. **Docker** → `docker images` mostra imagem de ~196MB; `docker ps` mostra healthcheck `healthy`.

---

## 3. Fundamentos DevOps (o que o professor pode perguntar)

### 3.1 Cultura e Governança (Aula 02 — Lean & Governança Ágil)
- **Origem Lean/Toyota**: produzir só o necessário (Just-In-Time). Código parado = estoque = custo.
- **8 desperdícios (Muda)**: defeitos, handoffs, inventário, burocracia, talento mal usado, movimentação (deploy manual), trabalho incompleto, **multitarefa** (o vilão).
- **WIP Limit**: "Pare de começar, comece a terminar." Máx. 2 cartões em "Doing".
- **GitFlow** (hierarquia das branches):
  - `main` = **O Altar** (produção, só código estável)
  - `dev` = **A Fábrica** (integração)
  - `feature/*` = **A Oficina** (trabalho isolado)
  - `hotfix` = **O Bombeiro** (emergência da produção)
- **Pull Request = Governança Humana + auditoria ITIL** — o PR é o "rastro digital da mudança".
- **Commits semânticos**: `closes #ID` fecha a issue e move o card automaticamente (rastreabilidade). Crime: commit "ajustes"/"."

### 3.2 Integração Contínua — CI (Aula CI)
- **Definição**: juntar o código de toda a equipe várias vezes ao dia; cada push dispara verificações automáticas. Objetivo: achar erro em minutos, não em semanas.
- **Fail Fast**: aborta na primeira falha grave (não gasta servidor analisando código que nem compila).
- **Arquitetura em estágios (Jobs)** ligados por `needs`:
  1. **Build** — `npm ci` + `npm run build` (compila/checa sintaxe).
  2. **Lint** — ESLint ("corretor ortográfico" do JS). Só roda se Build passar.
  3. **Inspeção (SonarQube)** — análise estática: bugs, **code smells**, vulnerabilidades. É a mais pesada → última da fila.
- **`npm ci` vs `npm install`**: `ci` usa exatamente o `package-lock.json` (previsível, próprio para CI).
- **GitHub Secrets**: nunca colocar senha/token no YAML (é versionado e visível). Injeta via `${{ secrets.NOME }}`, mascarado nos logs.
- **Quality Gate** do Sonar: regra inegociável; se falhar, "portão fecha" e a pipeline bloqueia o merge.
- **Runner**: VM efêmera; cada job começa do zero (por isso repete checkout + setup-node).

### 3.3 Entrega/Implantação Contínua — CD (Aula Revisão CI/CD/Deploy + Masterclass)
Cada branch = um nível de confiança no código:
```
dev (CI)  →  staging (CD)  →  main (produção)
validar      entregar artefato    implantar versão aprovada
```
- **Release**: o código vira **imagem Docker** (artefato reproduzível, imutável).
- **Registry** (Docker Hub): publica versão; mesma imagem roda em qualquer servidor; facilita rollback.
- **Imutabilidade**: "não consertamos servidores, nós os substituímos". Nova versão = nova imagem.
- **Deploy via SSH + SCP** (Parte 6): a pipeline **copia (SCP)** o `docker-compose.yml` para a EC2 e **executa (SSH)** `docker compose pull && up -d`. O servidor não tem o código-fonte, só o arquivo de instrução.
- **`docker compose pull`**: necessário porque `up` não rebaixa imagem com a mesma tag (`:latest`).

### 3.4 DevSecOps & Segurança (Masterclass — Release & Segurança)
- **SCA (Software Composition Analysis)**: monitora vulnerabilidades em libs de terceiros. Aqui: **Dependabot**.
- **CVE / NVD / CVSS**: CVE = registro de falha conhecida; NVD pontua via **CVSS (0–10)**. Severidade: **9.0–10 Critical**, 7.0–8.9 High, 4.0–6.9 Medium.
- **Trivy**: scanner que varre a **imagem** (não só o código) — pacotes, SO base, libs — procurando CVEs **antes** do push.
- **Shift-Left**: testar segurança na origem, não no fim. "Código limpo + imagem varrida = produção segura."
- **Zero Trust**: nunca confie, sempre verifique (varre imagem antes do push e em runtime).
- **Secrets / chave SSH**: criptografia assimétrica (par de chaves); chave pública vai em `~/.ssh/authorized_keys` na EC2.

### 3.5 Conteinerização (Aulas Conteinerização I e II)
- **Imagem vs Container**: imagem = blueprint estático; container = processo vivo (instância).
- **UnionFS / camadas**: cada instrução do Dockerfile cria uma camada (read-only, copy-on-write); camadas são reutilizadas/cacheadas.
- **Multi-stage build**: estágio `builder` compila dependências (toolchain do bcrypt), estágio `runtime` copia só o necessário → imagem final enxuta **sem** o toolchain.
- **Alpine**: distro mínima → imagem muito menor (196MB vs 1.69GB).
- **Healthcheck**: o Docker marca o container `unhealthy` se `/health` falhar.
- **Imperativo vs Declarativo**: `docker run ...` (passo a passo) vs `docker-compose.yml` (descreve o estado desejado — DSL/YAML).
- **DORA metrics**: Frequência de Deploy, Lead Time, Taxa de Falha de Mudança.

---

## 4. Pipeline CI/CD (`.github/workflows/ci.yml`)

```
            ┌─ build ─ lint ─┬─ test_sonar ─┐
push/PR ────┤                └─ docker_build ┴─ release_docker ─ trivy_sonar ─ deploy
            │   (toda branch/PR)              (push staging/main)        (flag ON + secrets)
```

| Job | Quando | O quê |
|-----|--------|-------|
| `build` | todo push/PR | `npm ci` + sintaxe |
| `lint` | após build | ESLint |
| `test_sonar` | após lint | Jest (cobertura) + SonarQube |
| `docker_build` | após lint | valida `docker build` (**required check** → #03) |
| `release_docker` | push staging/main | build & push imagem no Docker Hub (`:latest` + `:sha`) |
| `trivy_sonar` | push staging/main | Trivy escaneia a imagem → Sonar External Issues |
| `deploy` | flag `ENABLE_EC2_DEPLOY=true` | SCP compose + SSH `docker compose pull && up -d` |

**Branch protection (`main`)**: PR obrigatório · push direto bloqueado (`enforce_admins`) · required checks: *Build, Lint, Validação de Build Docker*.

---

## 5. Runbook — finalizar o DEPLOY ao vivo na EC2

O deploy está **armado e seguro por padrão** (atrás do flag `ENABLE_EC2_DEPLOY`). Para publicar na EC2:

### Passo 1 — descobrir 2 dados da EC2
- **IP/DNS público** da EC2 (a máquina que roda a rede `rede_alunos` + o container `mysql-infra`) — pedir ao professor / console AWS.
- **Usuário SSH** (geralmente `ubuntu` em AMIs Ubuntu; `ec2-user` em Amazon Linux). Veja o comando que você usa: `ssh -i chave.pem USUARIO@IP`.

### Passo 2 — configurar secrets e o flag (uma vez)
```bash
# Secrets de acesso
gh secret set EC2_SSH_KEY < caminho/para/chave.pem
printf 'SEU_IP'        | gh secret set EC2_HOST
printf 'ubuntu'        | gh secret set EC2_USER
# Banco central (do .env: container mysql-infra na rede rede_alunos)
printf 'mysql-infra'     | gh secret set DB_HOST
printf 'root'            | gh secret set DB_USER
printf 'password'        | gh secret set DB_PASS
printf 'danielodadevops' | gh secret set DB_NAME
# Liga o deploy
gh variable set ENABLE_EC2_DEPLOY --body true
```

### Passo 3 — migrar o schema do banco central (uma vez)
```bash
# Na EC2 (ou via SSH):
sudo docker exec -i mysql-infra mysql -uroot -ppassword < scripts/migrate.sql
# Se o banco já tiver tabelas ANTIGAS (sem price/item_id), rode os ALTERs comentados no fim do migrate.sql.
```

### Passo 4 — promover e deployar (GitFlow completo)
```bash
gh pr create --base staging --head dev --title "release: dev → staging" --body "Entrega"
gh pr merge dev --base staging --merge        # dispara: CI + Release Docker Hub + Trivy + Deploy
gh pr create --base main --head staging --title "release: staging → main" --body "Produção"
gh pr merge staging --base main --merge        # produção (passa pelos required checks)
```
App em produção: `http://SEU_IP:8081`

> **Por que eu (IA) não finalizei o deploy:** o classificador de segurança bloqueia, corretamente, SSH/escrita em **infra compartilhada do professor** com host/usuário que eu apenas **inferi**, e push para registry externo, sem sua autorização explícita por ação. Por isso o deploy fica como passo seu — e é ótimo demonstrá-lo ao vivo.

---

## 6. Perguntas prováveis do professor (respostas rápidas)

- **"O que impede um push direto na main?"** → Branch protection com PR obrigatório + `enforce_admins`. Teste: `git push origin main` → erro.
- **"Onde ficam as senhas da pipeline?"** → GitHub Secrets, injetadas em runtime, mascaradas nos logs. Nunca no YAML.
- **"Por que multi-stage?"** → Separa o ambiente de build (com toolchain p/ compilar o bcrypt) do runtime → imagem 88% menor, sem ferramentas de build (menor superfície de ataque).
- **"O que o Trivy faz que o Sonar não faz?"** → Trivy varre a **imagem** (SO, pacotes do sistema, libs) por CVEs; Sonar analisa o **código** (bugs, code smells). Integrados, dão visão única.
- **"O que é Fail Fast?"** → Abortar na 1ª falha grave (`needs` encadeia os jobs); economiza tempo/servidor.
- **"Como o deploy chega na EC2?"** → Pipeline faz SCP do compose + SSH `docker compose pull && up -d`. Servidor só tem instruções, não o código.
- **"Como o Dependabot ajudou?"** → Detectou 12 vulnerabilidades (2 críticas: ejs e mysql2); corrigi via bump de versões → `npm audit: 0`. Ele já abre PRs sozinho (ver branches `dependabot/*`).
- **"O que garante imutabilidade?"** → A mesma imagem testada é promovida; produção não rebuilda, faz `pull` da tag publicada.
