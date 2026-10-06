# YZI Jobs — Fase 1

Sistema de gestão de jobs da YZI: cada job fechado vira um projeto, cada área atualiza a própria trilha e a diretoria acompanha tudo na matriz de status. Os valores de cada job só aparecem para quem tem alçada ou para a analista comercial que vendeu o job, e essa regra é aplicada pelo banco (RLS do Postgres), não pela tela.

Stack: Next.js 16 (App Router, Server Components e Server Actions), Supabase (Postgres, Auth, Storage), Tailwind CSS 4, Resend e Vercel.

## Estrutura

```
app/(auth)/                  login, esqueci-senha, definir-senha
app/(app)/                   telas autenticadas: matriz (/), jobs, talentos, agenda, alertas, metas,
                             cadastros (talentos, marcas, metas), admin/usuarios, perfil
app/(app)/exportar/          downloads em CSV (matriz e metas), com a sessão de quem pede
app/api/cron/alertas         resumo diário de alertas por e-mail
app/auth/confirm             link dos e-mails de convite e redefinição de senha
components/ui/               peças reutilizáveis (botão, campos, combobox, janela, menu ⋯, paginação…)
lib/status.ts                rótulos das etapas (o banco guarda o índice) e situação do job
lib/perfis.ts                perfis e espelho das permissões para a interface
lib/matriz.ts                consulta e filtros da matriz (tela e exportação usam o mesmo)
supabase/migrations/         schema, RLS, triggers, views e funções (ver tabela abaixo)
scripts/                     importação da planilha, modelo de CSV e teste das regras de acesso
proxy.ts                     renova a sessão e protege as rotas
```

### Migrações

Aplique **todas, na ordem dos nomes**. Cada uma depende das anteriores.

| # | Arquivo | O que faz |
| --- | --- | --- |
| 1 | `…01_schema.sql` | Tabelas, tipos e índices |
| 2 | `…02_acesso.sql` | RLS, guardas de escrita por área e Storage de arquivos |
| 3 | `…03_historico_alertas.sql` | Histórico automático, view de alertas e vendas por analista |
| 4 | `…04_criar_job.sql` | Função `criar_job` (cria ficha, talentos, entregas e valores de uma vez) |
| 5 | `…05_entregaveis_fks.sql` | Ligações diretas de entregas com jobs e talentos |
| 6 | `…06_situacao_jobs.sql` | Situação do job (ativo, finalizado, cancelado) e trava de job encerrado |
| 7 | `…07_editar_job.sql` | Função `editar_job` e regras de incluir/remover talentos e entregas |
| 8 | `…08_foto_perfil.sql` | Foto de perfil (bucket `avatares`) |
| 9 | `…09_foto_talento.sql` | Foto do talento (bucket `talentos`) |
| 10 | `…10_historico_equipe.sql` | Histórico de mudanças na equipe (só a diretoria executiva lê) |

## Instalação

### 1. Supabase

1. Crie um projeto **exclusivo para o sistema** na região **South America (São Paulo)**. Crie dois: um de homologação e um de produção.
2. Aplique as migrações, de uma destas formas:
   - Com a [Supabase CLI](https://supabase.com/docs/guides/cli):
     ```bash
     supabase link --project-ref <ref-do-projeto>
     supabase db push
     ```
   - Ou cole os arquivos de `supabase/migrations/` no **SQL Editor**, um de cada vez, na ordem dos nomes.

   Os buckets do Storage (`arquivos`, `avatares`, `talentos`) são criados pelas migrações.
3. Em **Authentication → Sign In / Providers**, desative o cadastro público ("Allow new users to sign up"). Usuários entram só por convite.
4. Em **Authentication → URL Configuration**, defina o **Site URL** como o endereço do sistema e adicione `https://<seu-dominio>/auth/confirm` às **Redirect URLs**. Em desenvolvimento, use `http://localhost:3000`.
5. Configure os e-mails (passo 3 abaixo).
6. Crie o primeiro usuário em **Authentication → Users → Add user**, marcando "Auto Confirm User", e rode `supabase/primeiro-acesso.sql` com o nome e o e-mail dele. Essa pessoa (diretoria executiva) convida as demais em **Usuários**.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Na Vercel, cadastre as mesmas variáveis em cada ambiente.

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Conexão com o Supabase. A chave pública (anon ou `sb_publishable_…`) é segura: o RLS protege os dados |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente servidor (service role ou `sb_secret_…`): cron, gestão de usuários, remoção de arquivos e scripts |
| `NEXT_PUBLIC_SITE_URL` | Endereço do sistema, usado nos links dos e-mails |
| `RESEND_API_KEY`, `ALERTAS_FROM` | Envio do resumo diário de alertas |
| `CRON_SECRET` | A Vercel envia este valor ao chamar `/api/cron/alertas` |

### 3. E-mails

São dois tipos de e-mail, configurados em lugares diferentes:

**Convite e redefinição de senha (Supabase Auth).**

1. Em **Authentication → Emails → Templates**, ajuste **Invite user** e **Reset password** para usar o link:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/definir-senha
   ```
2. Em **Authentication → Emails → SMTP Settings**, configure um SMTP próprio. O Resend serve: host `smtp.resend.com`, porta `465`, usuário `resend` e, como senha, a `RESEND_API_KEY`. Sem SMTP próprio, o Supabase só envia poucos e-mails por hora, e apenas para os membros da organização no Supabase.

**Resumo diário de alertas (rota `/api/cron/alertas`).**

1. No [Resend](https://resend.com), verifique o domínio da YZI (registros DNS) e crie uma API key → `RESEND_API_KEY`.
2. Defina `ALERTAS_FROM` com um endereço desse domínio, ex.: `YZI Jobs <alertas@yzi.com.br>`.
3. Gere um valor aleatório para `CRON_SECRET` (ex.: `openssl rand -hex 32`) e cadastre na Vercel.
4. O `vercel.json` já agenda a rota todo dia às 8h de Brasília (11h UTC). Cada pessoa recebe só os alertas da sua área; a diretoria executiva recebe todos. Jobs finalizados e cancelados não geram alertas.
5. Para testar manualmente:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://<seu-dominio>/api/cron/alertas
   ```

### 4. Rodar localmente

```bash
npm install
npm run dev
```

Antes de publicar, confira que o build de produção passa:

```bash
npm run lint     # checagem de tipos
npm run build
```

### 5. Deploy na Vercel

Importe o repositório na Vercel, cadastre as variáveis e faça o deploy. O `vercel.json` já define a região `gru1` e o cron diário. Branch `develop` → homologação, `main` → produção.

## Teste das regras de acesso

`scripts/testar-acesso.mts` entra com um usuário de cada um dos 9 perfis e confere, no banco de verdade, quem vê os valores dos jobs e quem altera cada trilha, situação, cadastro e talento. Ele cria usuários e dados marcados com `[teste]` e **apaga tudo no fim**, mesmo se algum teste falhar. Rode de preferência em homologação, e sempre depois de uma migração nova:

```bash
npm run test:acesso -- --confirmar
```

Sem `--confirmar`, o script só mostra qual projeto vai usar e para. Ele sai com código 1 se alguma regra não se comportar como esperado.

## Importação da planilha atual

1. Exporte a planilha em CSV no formato de `scripts/modelo-planilha.csv` (uma linha por entregável; linhas com o mesmo número na coluna `job` formam um job).
2. Cadastre antes os usuários citados nas colunas de e-mail.
3. Simule (não grava nada):
   ```bash
   node --env-file=.env.local --experimental-strip-types scripts/importar-planilha.mts planilha.csv --simular
   ```
4. Corrija o que aparecer em `importacao-relatorio.csv` e rode sem `--simular`.

## Regras de acesso

| Perfil | Vê valores | Altera |
| --- | --- | --- |
| Diretoria executiva | Todos | Tudo, inclusive usuários; única que exclui jobs (só sem arquivos) |
| Diretora comercial | Todos | Ficha, valores e metas de qualquer job; transfere jobs entre analistas; finaliza, cancela e reabre jobs; talentos e marcas |
| Analista comercial | Só dos jobs que vendeu | Cria jobs; ficha, valores e talentos dos próprios jobs; finaliza, cancela e reabre os próprios jobs; talentos e marcas |
| Gerente jurídico/adm/financeiro | Todos | Jurídico, Administrativo, alvará (status e validade) e NFs |
| Analista financeiro | Todos | NFs (da YZI e dos talentos) |
| Analista jurídico/adm | Nenhum | Jurídico, Administrativo e alvará (status e validade) |
| Diretora estratégica | Nenhum | Trilha de Estratégia |
| Gerência de atendimento | Nenhum | Status das entregas; inclui, edita e exclui entregas |
| Analista de atendimento | Nenhum | Status das entregas; inclui e edita entregas |

Outras regras garantidas pelo banco:

- **NFs e contratos anexados** seguem a regra dos valores, porque mostram os números. Contratos também ficam liberados para o analista jurídico/adm. Um arquivo só pode ser excluído por quem o enviou ou pela diretoria executiva.
- **Job finalizado ou cancelado** fica travado: nenhuma trilha, entrega, talento ou arquivo muda até ele ser reaberto. Encerrados não geram alertas; cancelados não contam nas metas. Cancelar exige motivo.
- **Talento sai de um job** só se a NF dele não andou, nenhuma entrega dele foi publicada e não há arquivo dele anexado. O job precisa manter pelo menos um talento.
- **Entrega publicada** não pode ser excluída.
- **Talentos e marcas** com jobs não podem ser excluídos: talentos são desativados; marcas, só renomeadas.
- **Usuários** que já entraram no sistema não são excluídos, só desativados (a pessoa perde o acesso e o histórico continua íntegro). Ninguém altera o próprio perfil ou acesso, e o sistema não deixa ficar sem diretoria executiva ativa.
- **Foto de perfil:** cada pessoa troca só a própria. **Foto do talento:** Comercial e diretoria.
- O **histórico** do job registra quando os valores mudam, mas nunca os valores em si. O **histórico da equipe** registra convites, perfis, acessos, nomes e e-mails.

## Ajustes comuns

- **Renomear uma etapa:** edite `ETAPAS` em `lib/status.ts` e a versão curta em `ETAPAS_CURTAS` (usada na matriz). Para **adicionar** uma etapa, ajuste também o `check` da coluna correspondente numa nova migração.
- **Prazos dos alertas:** edite o bloco `params` da view `v_alertas` numa nova migração.
- **Nova regra de acesso:** altere a policy ou o trigger numa nova migração, espelhe em `lib/perfis.ts` (para a tela esconder o que o banco recusa) e acrescente o caso em `scripts/testar-acesso.mts`.
