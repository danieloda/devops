# CI Pipeline - Build, Lint e SonarQube

## Problema

O projeto não possui pipeline de CI. Código pode ser mergeado sem validação automática. A avaliação exige pipeline com build, lint e SonarQube funcionando.

## Solução

Pipeline de 3 estágios sequenciais no GitHub Actions, seguindo o modelo da aula (Fail Fast):

1. **Build** — valida que dependências instalam e código tem sintaxe correta
2. **Lint** — valida padrão de código com ESLint (needs: build)
3. **SonarQube** — inspeção estática via SonarCloud (needs: lint)

## Arquivos

### 1. `.github/workflows/ci.yml`
Pipeline com 3 jobs sequenciais:
- `job_build`: checkout, setup Node 18, `npm ci`, `npm run build`
- `job_lint`: needs job_build, checkout, setup Node 18, `npm ci`, `npm run lint`
- `job_sonar`: needs job_lint, checkout, `sonarsource/sonarqube-scan-action@master` com secrets

Triggers: push e pull_request em branches `dev` e `main`.

### 2. `package.json`
- Script `"build": "node --check index.js"` (syntax check sem executar)
- Script `"lint": "eslint ."`
- devDependency: `eslint`

### 3. `.eslintrc.json`
Config mínima para Node.js:
- env: node, es2021
- regras recomendadas do ESLint

### 4. `sonar-project.properties`
- Organization: `danieloda`
- Project key: `danieloda_devops`
- Sources: `.`
- Exclusions: `node_modules/`, `docs/`

## Secrets (já configurados)
- `SONAR_TOKEN` — token do SonarCloud
- `SONAR_HOST_URL` — `https://sonarcloud.io`

## Critério de Aceite
- GitHub Actions check aparece "verde" nos PRs
- SonarQube mostra resultado da análise no SonarCloud
