# Documentação Técnica - Rotas do Hub da Core API

## Consumo pelo BFF do Hub

A tela de cupons em `/tickets` e a auditoria em `/audit` consomem exclusivamente o BFF. Rotas disponíveis:

| Método | Rota do BFF | Core API |
|---|---|---|
| `GET` | `/api/coupons?page=&size=&active=&type=&search=` | `GET /api/hub/coupons` |
| `GET` | `/api/coupons/{couponId}` | `GET /api/hub/coupons/{couponId}` |
| `POST` | `/api/coupons` | `POST /api/hub/coupons` |
| `PUT` | `/api/coupons/{couponId}` | `PUT /api/hub/coupons/{couponId}` |
| `PATCH` | `/api/coupons/{couponId}/status` | `PATCH /api/hub/coupons/{couponId}/status` |
| `DELETE` | `/api/coupons/{couponId}` | `DELETE /api/hub/coupons/{couponId}` |
| `POST` | `/api/coupons/validate` | `POST /api/hub/coupons/validate` |

### Gestão de usuários em `/users`

As rotas abaixo são proxies do hubbackend. Todas usam o tenant resolvido do JWT da sessão e o token Bearer recebido; não aceitam seletor de tenant. O BFF converte bodies camelCase para snake_case e respostas snake_case para camelCase, mantendo os status e mensagens de erro do Core.

| Método | Rota do BFF | Core API |
|---|---|---|
| `GET` | `/api/users?page=&size=&search=&active=` | `GET /api/hub/users` |
| `GET` | `/api/users/{userId}` | `GET /api/hub/users/{userId}` |
| `POST` | `/api/users` | `POST /api/hub/users` |
| `PATCH` | `/api/users/{userId}` | `PATCH /api/hub/users/{userId}` |
| `PATCH` | `/api/users/{userId}/status` | `PATCH /api/hub/users/{userId}/status` |
| `DELETE` | `/api/users/{userId}` | `DELETE /api/hub/users/{userId}` |
| `GET` | `/api/roles` | `GET /api/hub/roles?includePermissions=false` |

`users:read` permite listar e detalhar; `users:manage` permite as mutações e consultar roles para atribuição. A remoção preserva o `204 No Content` do Core. A busca `search` e os filtros `active`, `page` e `size` são encaminhados sem transformação.
| `GET` | `/api/activity-logs` | `GET /api/hub/activity-logs` |
| `GET` | `/api/activity-logs/{id}` | `GET /api/hub/activity-logs/{id}` |

As rotas de auditoria aceitam `page` (padrão `0`, mínimo `0`), `size` (padrão `20`, entre `1` e `100`), `action`, `entity`, `search`, `entityId` (UUID), `performedByUserId` (UUID), `dateFrom` e `dateTo` (`YYYY-MM-DD`). A resposta da listagem usa `content`, `page`, `size`, `totalElements` e `totalPages` em camelCase. O BFF valida os parâmetros e encaminha token e tenant ao Core API; erros de validação retornam `400`, erros do Core preservam o status e indisponibilidade retorna `502`. O Core API exige `activity_logs:read` ou `audit:read`.

O frontend usa JSON camelCase; o BFF converte os corpos para snake_case exigido pela configuração Jackson do Core e normaliza respostas para camelCase. O BFF valida IDs UUID, filtros e regras do payload, preserva status/erros upstream e retorna `204 No Content` no `DELETE`. O caminho legado `/coupons` redireciona para `/tickets`.

Documento focado no consumo pelo frontend. Foram consideradas apenas rotas implementadas sob `/api/hub/**`.

## Convenções gerais

- Autenticação protegida: `Authorization: Bearer <accessToken>` com claim/contexto `hub` (`CONTEXT_hub`) e a permissão indicada em cada rota.
- Tenant atual: rotas protegidas do Hub usam o header `X-Tenant-Slug: <slug-do-tenant>`. O filtro também aceita o header legado `X-Marvi-Tenant`.
- Rotas públicas: não exigem `Authorization`, conforme `SecurityConfig`.
- Datas de query: `dateFrom` e `dateTo` usam formato `YYYY-MM-DD`.
- Datas no body/resposta: `OffsetDateTime` em ISO-8601.
- Paginação: respostas paginadas usam `{ content, page, size, totalElements, totalPages }`.
- Erro padrão: `{ timestamp, status, error, message, path, fields }`.
- Erro com detalhes, usado em estoque insuficiente: `{ timestamp, status, error, message, path, fields, details }`.
- Campos não enviados por uma rota devem ser tratados como `não se aplica`.

## Autenticação

### `POST /api/hub/auth/register`

- Descrição: cadastra tenant/mercado e usuário owner inicial do Hub.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `marketName` | string | sim | mínimo 3 caracteres |
| `slug` | string | não | se ausente, é derivado de `marketName` |
| `documentNumber` | string | sim | CNPJ; serviço normaliza para dígitos e exige 14 dígitos |
| `contactEmail` | string/email | sim | e-mail de contato do tenant |
| `ownerName` | string | sim | nome do owner |
| `ownerEmail` | string/email | sim | e-mail do owner |
| `ownerPassword` | string | sim | mínimo 8 caracteres |

Exemplo de requisição:

```http
POST /api/hub/auth/register
Content-Type: application/json

{
  "marketName": "Mercado Central",
  "slug": "mercado-central",
  "documentNumber": "12.345.678/0001-90",
  "contactEmail": "contato@mercado.com",
  "ownerName": "Ana Souza",
  "ownerEmail": "ana@mercado.com",
  "ownerPassword": "senha1234"
}
```

Exemplo de resposta `201`:

```json
{
  "tenant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "marketName": "Mercado Central",
    "slug": "mercado-central",
    "documentNumber": "12345678000190",
    "status": "ACTIVE",
    "setupComplete": false
  },
  "owner": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Ana Souza",
    "email": "ana@mercado.com",
    "roles": ["OWNER"]
  },
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<refresh-token>",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

- Possíveis status HTTP: `201`, `400`, `409`, `500`.
- Observações importantes: conflitos conhecidos incluem slug, CNPJ, schema ou e-mail do owner já existentes.

### `POST /api/hub/auth/login`

- Descrição: autentica usuário do Hub; pode retornar login direto ou seleção de tenant.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Headers: `X-Tenant-Slug` opcional; se informado, tenta login diretamente nesse tenant.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `email` | string/email | sim | normalizado para minúsculas |
| `password` | string | sim | senha do usuário |

Exemplo de requisição:

```http
POST /api/hub/auth/login
X-Tenant-Slug: mercado-central
Content-Type: application/json

{
  "email": "ana@mercado.com",
  "password": "senha1234"
}
```

Exemplo de resposta `200` com tenant resolvido:

```json
{
  "user": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Ana Souza",
    "email": "ana@mercado.com",
    "active": true,
    "roles": [{ "id": "33333333-3333-3333-3333-333333333333", "name": "OWNER" }],
    "permissions": ["products:read", "orders:read"]
  },
  "tenant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "marketName": "Mercado Central",
    "slug": "mercado-central",
    "status": "ACTIVE",
    "setupComplete": false
  },
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<refresh-token>",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

Exemplo de resposta `200` quando há múltiplos tenants:

```json
{
  "status": "TENANT_SELECTION_REQUIRED",
  "selectionToken": "<selection-token>",
  "user": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Ana Souza",
    "email": "ana@mercado.com"
  },
  "tenants": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "marketName": "Mercado Central",
      "slug": "mercado-central"
    }
  ]
}
```

- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: se o usuário pertence a múltiplos tenants e o header não for enviado, o frontend deve abrir seleção de mercado e chamar `/select-tenant`.

### `POST /api/hub/auth/select-tenant`

- Descrição: conclui login após resposta `TENANT_SELECTION_REQUIRED`.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `selectionToken` | string | sim | token retornado pelo login |
| `tenantId` | UUID | sim | tenant escolhido |

Exemplo de requisição:

```http
POST /api/hub/auth/select-tenant
Content-Type: application/json

{
  "selectionToken": "<selection-token>",
  "tenantId": "11111111-1111-1111-1111-111111111111"
}
```

Exemplo de resposta `200`: mesmo formato de login com `user`, `tenant` e `tokens`.

- Possíveis status HTTP: `200`, `400`, `401`, `403`, `500`.
- Observações importantes: token de seleção expirado retorna `401` com erro `SELECTION_TOKEN_EXPIRED`.

### `POST /api/hub/auth/refresh`

- Descrição: renova access token usando refresh token.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `refreshToken` | string | sim | token de refresh do Hub |

Exemplo de requisição:

```http
POST /api/hub/auth/refresh
Content-Type: application/json

{ "refreshToken": "<refresh-token>" }
```

Exemplo de resposta `200`:

```json
{
  "accessToken": "<novo-jwt>",
  "refreshToken": "<novo-refresh-token>",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

- Possíveis status HTTP: `200`, `400`, `401`, `403`, `500`.
- Observações importantes: refresh expirado ou inválido retorna `401`.

### `POST /api/hub/auth/logout`

- Descrição: revoga refresh token do usuário autenticado.
- Autenticação necessária: Bearer JWT Hub com `CONTEXT_hub`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `refreshToken` | string | não | body inteiro é opcional |

Exemplo de requisição:

```http
POST /api/hub/auth/logout
Authorization: Bearer <accessToken>
X-Tenant-Slug: mercado-central
Content-Type: application/json

{ "refreshToken": "<refresh-token>" }
```

Exemplo de resposta: `204 No Content`.

- Possíveis status HTTP: `204`, `401`, `403`, `500`.
- Observações importantes: rota não retorna body.

### `POST /api/hub/auth/forgot-password`

- Descrição: solicita recuperação de senha.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Headers: `X-Tenant-Slug` opcional no controller.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `tenantSlug` | string | não | presente no DTO; uso no serviço atual não identificado |
| `email` | string/email | sim | e-mail para recuperação |

Exemplo de requisição:

```http
POST /api/hub/auth/forgot-password
Content-Type: application/json

{
  "tenantSlug": "mercado-central",
  "email": "ana@mercado.com"
}
```

Exemplo de resposta `200`:

```json
{
  "message": "Se o e-mail informado estiver cadastrado, enviaremos instrucoes para redefinir a senha."
}
```

- Possíveis status HTTP: `200`, `400`, `500`.
- Observações importantes: a resposta é genérica para evitar enumeração de usuários.

### `POST /api/hub/auth/recover-email`

- Descrição: solicita recuperação/listagem mascarada de e-mails ativos de um tenant, enviada ao e-mail de contato.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `tenantSlug` | string | sim | slug do tenant |
| `documentNumber` | string | sim | CNPJ; serviço normaliza para dígitos |

Exemplo de requisição:

```http
POST /api/hub/auth/recover-email
Content-Type: application/json

{
  "tenantSlug": "mercado-central",
  "documentNumber": "12.345.678/0001-90"
}
```

Exemplo de resposta `200`:

```json
{
  "message": "Se os dados informados estiverem corretos, enviaremos as instruções para o e-mail de contato cadastrado."
}
```

- Possíveis status HTTP: `200`, `400`, `500`.
- Observações importantes: resposta genérica mesmo quando dados não conferem.

### `POST /api/hub/auth/reset-password`

- Descrição: redefine senha usando token recebido por e-mail.
- Autenticação necessária: pública.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `tenantSlug` | string | não | presente no DTO; uso no serviço atual não identificado |
| `token` | string | sim | token de reset |
| `newPassword` | string | sim | mínimo 8 caracteres por regra de serviço |
| `confirmPassword` | string | sim | deve ser igual a `newPassword` |

Exemplo de requisição:

```http
POST /api/hub/auth/reset-password
Content-Type: application/json

{
  "tenantSlug": "mercado-central",
  "token": "<reset-token>",
  "newPassword": "novaSenha123",
  "confirmPassword": "novaSenha123"
}
```

Exemplo de resposta `200`:

```json
{ "message": "Senha redefinida com sucesso." }
```

- Possíveis status HTTP: `200`, `400`, `401`, `500`.
- Observações importantes: token inválido ou expirado retorna `401`.

### `POST /api/hub/auth/change-password`

- Descrição: altera senha do usuário autenticado.
- Autenticação necessária: Bearer JWT Hub com `CONTEXT_hub`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body da requisição:

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `currentPassword` | string | sim | senha atual |
| `newPassword` | string | sim | mínimo 8 caracteres por regra de serviço |
| `confirmPassword` | string | sim | deve ser igual a `newPassword` |

Exemplo de requisição:

```http
POST /api/hub/auth/change-password
Authorization: Bearer <accessToken>
X-Tenant-Slug: mercado-central
Content-Type: application/json

{
  "currentPassword": "senha1234",
  "newPassword": "novaSenha123",
  "confirmPassword": "novaSenha123"
}
```

Exemplo de resposta `200`:

```json
{ "message": "Senha alterada com sucesso." }
```

- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: senha atual inválida retorna `400` com erro `INVALID_CURRENT_PASSWORD`.

## Usuários, Roles e Permissões

### `GET /api/hub/users/me`

- Descrição: retorna os dados do usuário autenticado no tenant atual, incluindo nome, e-mail, roles e permissões. Usado pelo Hub para recuperar o nome em sessões que foram abertas antes do cache local de usuário.
- Autenticação necessária: `Authorization: Bearer <accessToken>` com contexto `hub`.
- Tenant: header `X-Tenant-Slug` obrigatório.
- Parâmetros de URL, query params e body: nenhum.
- Resposta `200`: `UserDetailsResponse` com `id`, `name`, `email`, `active`, `roles`, `permissions`, `createdAt`, `updatedAt` e `deletedAt`.
- Possíveis status HTTP: `200`, `401`, `403`, `404`.

### `POST /api/hub/users`

- Descrição: cria usuário no tenant atual.
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `name` string obrigatório; `email` string/email obrigatório; `password` string obrigatório, mínimo 8; `roleIds` array de UUID obrigatório e não vazio.
- Exemplo de requisição: `POST /api/hub/users` com `{ "name": "Carlos", "email": "carlos@mercado.com", "password": "senha1234", "roleIds": ["33333333-3333-3333-3333-333333333333"] }`.
- Exemplo de resposta `201`: `{ "id": "44444444-4444-4444-4444-444444444444", "name": "Carlos", "email": "carlos@mercado.com", "active": true, "roles": [{ "id": "33333333-3333-3333-3333-333333333333", "name": "OPERADOR" }], "createdAt": "2026-06-18T10:00:00" }`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: e-mail duplicado retorna conflito; roles inexistentes/inativas retornam erro.

### `GET /api/hub/users`

- Descrição: lista usuários do tenant atual.
- Autenticação necessária: `CONTEXT_hub` + `users:read` ou `users:manage`.
- Parâmetros de URL: nenhum.
- Query params: `page` int opcional default `0`; `size` int opcional default `20`; `search` string opcional; `active` boolean opcional.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/users?page=0&size=20&search=carlos&active=true`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "44444444-4444-4444-4444-444444444444", "name": "Carlos", "email": "carlos@mercado.com", "active": true, "roles": [], "createdAt": "2026-06-18T10:00:00" }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `page < 0` ou `size < 1` retorna `400`.

### `GET /api/hub/users/{userId}`

- Descrição: detalha usuário.
- Autenticação necessária: `CONTEXT_hub` + `users:read` ou `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/users/44444444-4444-4444-4444-444444444444`.
- Exemplo de resposta `200`: `{ "id": "44444444-4444-4444-4444-444444444444", "name": "Carlos", "email": "carlos@mercado.com", "active": true, "roles": [], "permissions": ["products:read"], "createdAt": "2026-06-18T10:00:00", "updatedAt": "2026-06-18T10:00:00", "deletedAt": null }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: usuário removido/inexistente retorna `404`.

### `GET /api/hub/users/{userId}/permissions-by-market`

- Descrição: permissões efetivas do usuário por mercado (usada pelo frontend, via BFF em `GET /api/users/{userId}/permissions-by-market`, para verificar as permissões do usuário logado no mercado atual).
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: `id_market` UUID opcional — restringe a resposta a um mercado específico.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/users/44444444-4444-4444-4444-444444444444/permissions-by-market?id_market=11111111-1111-1111-1111-111111111111`.
- Exemplo de resposta `200`: `{ "userId": "44444444-4444-4444-4444-444444444444", "markets": [{ "marketId": "11111111-1111-1111-1111-111111111111", "marketName": "Mercado Central", "tenantSlug": "mercado-central", "permissions": ["orders:read", "orders:update", "orders:cancel"] }] }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: o serviço só inclui mercados em que o usuário que fez a requisição (ator) possui `users:manage`; sem essa permissão a rota responde `403` ou retorna `markets` vazio. O frontend trata a falha mantendo as permissões obtidas no login — a autorização real continua sendo aplicada pelo Core API em cada endpoint.

### `PUT /api/hub/users/{userId}`

- Descrição: atualiza usuário substituindo dados principais e roles.
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: nenhum.
- Body: `name` string opcional, mínimo 2; `email` string/email opcional; `active` boolean obrigatório; `roleIds` array de UUID obrigatório e não vazio.
- Exemplo de requisição: `PUT /api/hub/users/{userId}` com `{ "name": "Carlos Silva", "email": "carlos@mercado.com", "active": true, "roleIds": ["33333333-3333-3333-3333-333333333333"] }`.
- Exemplo de resposta `200`: `UserDetailsResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: o serviço impede remover/desativar o último usuário com perfil administrativo.

### `PATCH /api/hub/users/{userId}`

- Descrição: atualização parcial de usuário.
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: nenhum.
- Body: `name` string opcional, mínimo 2; `email` string/email opcional; `active` boolean opcional; `roleIds` array de UUID opcional.
- Exemplo de requisição: `PATCH /api/hub/users/{userId}` com `{ "active": false }`.
- Exemplo de resposta `200`: `UserDetailsResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: campos ausentes permanecem inalterados.

### `PUT /api/hub/users/{userId}/roles`

- Descrição: substitui roles do usuário.
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: nenhum.
- Body: `roleIds` array de UUID obrigatório e não vazio.
- Exemplo de requisição: `PUT /api/hub/users/{userId}/roles` com `{ "roleIds": ["33333333-3333-3333-3333-333333333333"] }`.
- Exemplo de resposta `200`: `UserDetailsResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: roles inexistentes ou inativas retornam `400`.

### `PATCH /api/hub/users/{userId}/status`

- Descrição: ativa ou desativa usuário.
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: nenhum.
- Body: `active` boolean obrigatório.
- Exemplo de requisição: `PATCH /api/hub/users/{userId}/status` com `{ "active": false }`.
- Exemplo de resposta `200`: `UserDetailsResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: o serviço impede desativar o último usuário com perfil administrativo.

### `DELETE /api/hub/users/{userId}`

- Descrição: remove usuário.
- Autenticação necessária: `CONTEXT_hub` + `users:manage`.
- Parâmetros de URL: `userId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `DELETE /api/hub/users/44444444-4444-4444-4444-444444444444`.
- Exemplo de resposta: `204 No Content`.
- Possíveis status HTTP: `204`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: rota não retorna body.

### `GET /api/hub/roles`

- Descrição: lista roles do tenant atual.
- Autenticação necessária: `CONTEXT_hub` + `roles:read`, `roles:manage` ou `users:manage` (a última permissão permite consultar opções de role durante a gestão de usuários).
- Parâmetros de URL: nenhum.
- Query params: `includePermissions` boolean opcional default `true`.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/roles?includePermissions=true`.
- Exemplo de resposta `200`: `{ "roles": [{ "id": "33333333-3333-3333-3333-333333333333", "name": "OPERADOR", "description": "Operador", "systemRole": false, "active": true, "permissions": ["products:read"], "createdAt": "2026-06-18T10:00:00", "updatedAt": "2026-06-18T10:00:00" }] }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: quando `includePermissions=false`, campos nulos podem ser omitidos por `JsonInclude`.

### `GET /api/hub/roles/{roleId}`

- Descrição: detalha role.
- Autenticação necessária: `CONTEXT_hub` + `roles:read` ou `roles:manage`.
- Parâmetros de URL: `roleId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/roles/33333333-3333-3333-3333-333333333333`.
- Exemplo de resposta `200`: `{ "id": "33333333-3333-3333-3333-333333333333", "name": "OPERADOR", "description": "Operador", "systemRole": false, "active": true, "permissions": [{ "id": "55555555-5555-5555-5555-555555555555", "code": "products:read", "description": "Ler produtos", "module": "products" }], "createdAt": "2026-06-18T10:00:00", "updatedAt": "2026-06-18T10:00:00" }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: role inexistente retorna `404`.

### `POST /api/hub/roles`

- Descrição: cria role customizada.
- Autenticação necessária: `CONTEXT_hub` + `roles:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `name` string obrigatório; `description` string opcional; `permissionIds` array de UUID opcional.
- Exemplo de requisição: `POST /api/hub/roles` com `{ "name": "CAIXA", "description": "Caixa", "permissionIds": ["55555555-5555-5555-5555-555555555555"] }`.
- Exemplo de resposta `201`: `RoleDetailsResponse`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: nome duplicado retorna `409`.

### `PUT /api/hub/roles/{roleId}`

- Descrição: atualiza role customizada.
- Autenticação necessária: `CONTEXT_hub` + `roles:manage`.
- Parâmetros de URL: `roleId` UUID obrigatório.
- Query params: nenhum.
- Body: `name` string obrigatório; `description` string opcional; `active` boolean obrigatório; `permissionIds` array de UUID opcional.
- Exemplo de requisição: `PUT /api/hub/roles/{roleId}` com `{ "name": "CAIXA", "description": "Caixa", "active": true, "permissionIds": ["55555555-5555-5555-5555-555555555555"] }`.
- Exemplo de resposta `200`: `RoleDetailsResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: roles de sistema não podem ser alteradas.

### `PATCH /api/hub/roles/{roleId}/status`

- Descrição: ativa ou desativa role customizada.
- Autenticação necessária: `CONTEXT_hub` + `roles:manage`.
- Parâmetros de URL: `roleId` UUID obrigatório.
- Query params: nenhum.
- Body: `active` boolean obrigatório.
- Exemplo de requisição: `PATCH /api/hub/roles/{roleId}/status` com `{ "active": false }`.
- Exemplo de resposta `200`: `RoleDetailsResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: o serviço valida segurança de papéis administrativos.

### `GET /api/hub/permissions`

- Descrição: lista permissões disponíveis.
- Autenticação necessária: `CONTEXT_hub` + `roles:read` ou `roles:manage` ou `users:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/permissions`.
- Exemplo de resposta `200`: `{ "permissions": [{ "id": "55555555-5555-5555-5555-555555555555", "code": "products:read", "description": "Ler produtos", "module": "products" }] }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: útil para montar formulário de roles e permissões.

## Categorias

### Campos de `CategoryRequest`

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `name` | string | sim | máximo 120 |
| `description` | string | não | texto livre |
| `canonicalKey` | string | não | máximo 80; vincula categoria canônica do catálogo |
| `active` | boolean | não | a tela envia o valor explicitamente em criação e atualização |

### `GET /api/hub/categories`

- Descrição: lista categorias do tenant.
- Autenticação necessária: `CONTEXT_hub` + `products:read`.
- Parâmetros de URL: nenhum.
- Query params: `page` int default `0`; `size` int default `20`; `search` string opcional; `active` boolean opcional.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/categories?page=0&size=20&search=bebidas&active=true`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "66666666-6666-6666-6666-666666666666", "name": "Bebidas", "description": "Bebidas em geral", "active": true, "canonicalCategory": null, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z", "deletedAt": null }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `page < 0` ou `size < 1` retorna `400`.

### `POST /api/hub/categories`

- Descrição: cria categoria.
- Autenticação necessária: `CONTEXT_hub` + `products:create`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `CategoryRequest`.
- Exemplo de requisição: `POST /api/hub/categories` com `{ "name": "Bebidas", "description": "Bebidas em geral", "canonicalKey": "beverages", "active": true }`.
- Exemplo de resposta `201`: `CategoryResponse`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: nome duplicado retorna `409`; `canonicalKey` inexistente/inativo retorna `404`.

### `GET /api/hub/categories/{categoryId}`

- Descrição: detalha categoria.
- Autenticação necessária: `CONTEXT_hub` + `products:read`.
- Parâmetros de URL: `categoryId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/categories/66666666-6666-6666-6666-666666666666`.
- Exemplo de resposta `200`: `CategoryResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: categoria removida/inexistente retorna `404`.

### `PUT /api/hub/categories/{categoryId}`

- Descrição: atualiza categoria.
- Autenticação necessária: `CONTEXT_hub` + `products:update`.
- Parâmetros de URL: `categoryId` UUID obrigatório.
- Query params: nenhum.
- Body: `CategoryRequest`.
- Exemplo de requisição: `PUT /api/hub/categories/{categoryId}` com `{ "name": "Bebidas", "description": "Bebidas frias", "canonicalKey": "beverages", "active": true }`.
- Exemplo de resposta `200`: `CategoryResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: atualiza o recurso completo conforme body.

### `DELETE /api/hub/categories/{categoryId}`

- Descrição: exclui categoria.
- Autenticação necessária: `CONTEXT_hub` + `products:delete`.
- Parâmetros de URL: `categoryId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `DELETE /api/hub/categories/66666666-6666-6666-6666-666666666666`.
- Exemplo de resposta `200`: `CategoryResponse` da categoria removida.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: a rota retorna body, não `204`.

### `GET /api/hub/catalog-categories`

- Descrição: lista as opções ativas de categoria canônica para vincular uma categoria do tenant.
- Autenticação necessária: `CONTEXT_hub` + `products:read`.
- Parâmetros de URL, query params e body: nenhum.
- Resposta `200`: array de todas as categorias canônicas, ordenado por `sortOrder`, contendo `id`, `key`, `name` e `active`.
- Possíveis status HTTP: `200`, `401`, `403`, `500`.
- Observações importantes: categorias inativas aparecem como opções indisponíveis no seletor. O BFF disponibiliza a mesma operação em `GET /api/catalog-categories`.

## Produtos e Estoque

### Campos de `ProductRequest`

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `categoryId` | UUID | não | categoria do produto |
| `name` | string | sim | máximo 160 |
| `description` | string | não | texto livre |
| `sku` | string | não | máximo 80 |
| `barcode` | string | não | máximo 80 |
| `price` | decimal | sim | mínimo `0.00` |
| `promotionalPrice` | decimal | não | mínimo `0.00`; campo aceito no DTO |
| `stockQuantity` | int | sim | mínimo `0` |
| `lowStockThreshold` | int | não | mínimo `0` |
| `imageUrl` | string | não | URL da imagem |
| `active` | boolean | não | se ausente, comportamento default não identificado no controller |

### `GET /api/hub/products`

- Descrição: lista produtos.
- Autenticação necessária: `CONTEXT_hub` + `products:read`.
- Parâmetros de URL: nenhum.
- Query params: `page`, `size`, `search`, `categoryId` UUID, `active` boolean, `lowStock` boolean.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/products?page=0&size=20&search=arroz&categoryId=66666666-6666-6666-6666-666666666666&active=true&lowStock=false`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "77777777-7777-7777-7777-777777777777", "name": "Arroz 5kg", "description": "Tipo 1", "sku": "ARR-5KG", "barcode": "7890000000000", "price": 29.90, "promotionalPrice": null, "appliedPromotion": null, "stockQuantity": 10, "lowStockThreshold": 3, "lowStock": false, "imageUrl": null, "active": true, "category": null, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z", "deletedAt": null }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: resposta pode trazer `promotionalPrice` e `appliedPromotion` calculados.

### `POST /api/hub/products`

- Descrição: cria produto.
- Autenticação necessária: `CONTEXT_hub` + `products:create`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `ProductRequest`.
- Exemplo de requisição: `POST /api/hub/products` com `{ "categoryId": "66666666-6666-6666-6666-666666666666", "name": "Arroz 5kg", "description": "Tipo 1", "sku": "ARR-5KG", "barcode": "7890000000000", "price": 29.90, "stockQuantity": 10, "lowStockThreshold": 3, "active": true }`.
- Exemplo de resposta `201`: `ProductResponse`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: SKU ou barcode duplicado retorna `409`; categoria inválida retorna `404`.

### `GET /api/hub/products/low-stock`

- Descrição: lista produtos com estoque baixo.
- Autenticação necessária: `CONTEXT_hub` + `stock:read`.
- Parâmetros de URL: nenhum.
- Query params: `page` int default `0`; `size` int default `20`.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/products/low-stock?page=0&size=20`.
- Exemplo de resposta `200`: `PageResponse<ProductResponse>`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: produto é considerado baixo estoque quando `stockQuantity <= lowStockThreshold`.

### `GET /api/hub/products/{productId}`

- Descrição: detalha produto.
- Autenticação necessária: `CONTEXT_hub` + `products:read`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/products/77777777-7777-7777-7777-777777777777`.
- Exemplo de resposta `200`: `ProductResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: produto removido/inexistente retorna `404`.

### `PUT /api/hub/products/{productId}`

- Descrição: atualiza produto.
- Autenticação necessária: `CONTEXT_hub` + `products:update`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: nenhum.
- Body: `ProductRequest`.
- Exemplo de requisição: `PUT /api/hub/products/{productId}` com `{ "categoryId": "66666666-6666-6666-6666-666666666666", "name": "Arroz 5kg", "price": 31.90, "stockQuantity": 12, "active": true }`.
- Exemplo de resposta `200`: `ProductResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: usa validações de criação.

### `PATCH /api/hub/products/{productId}/stock`

- Descrição: ajusta estoque.
- Autenticação necessária: `CONTEXT_hub` + `stock:adjust`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: nenhum.
- Body: `operation` string obrigatório, valores `SET`, `INCREMENT`, `DECREMENT`; `quantity` int obrigatório, mínimo `0`; `reason` string opcional, máximo 1000.
- Exemplo de requisição: `PATCH /api/hub/products/{productId}/stock` com `{ "operation": "INCREMENT", "quantity": 5, "reason": "Entrada de estoque" }`.
- Exemplo de resposta `200`: `ProductResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `DECREMENT` acima do disponível retorna `400`.

### `GET /api/hub/products/{productId}/stock-movements`

- Descrição: lista histórico de movimentações de estoque do produto.
- Autenticação necessária: `CONTEXT_hub` + `stock:read`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: `page` int default `0`; `size` int default `20`.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/products/{productId}/stock-movements?page=0&size=20`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "88888888-8888-8888-8888-888888888888", "operation": "INCREMENT", "previousQuantity": 10, "changedQuantity": 5, "newQuantity": 15, "reason": "Entrada de estoque", "performedByUserId": "22222222-2222-2222-2222-222222222222", "createdAt": "2026-06-18T10:00:00Z" }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `operation` na resposta é enum `SET`, `INCREMENT` ou `DECREMENT`.

### `POST /api/hub/products/{productId}/image-upload-url`

- Descrição: gera URL pré-assinada para upload de imagem.
- Autenticação necessária: `CONTEXT_hub` + `storage:upload`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: nenhum.
- Body: `fileName` string obrigatório, máximo 255; `contentType` string obrigatório, máximo 100.
- Exemplo de requisição: `POST /api/hub/products/{productId}/image-upload-url` com `{ "fileName": "arroz.png", "contentType": "image/png" }`.
- Exemplo de resposta `200`: `{ "uploadUrl": "https://storage.example/upload", "publicUrl": "https://storage.example/public/tenants/mercado-central/products/77777777-7777-7777-7777-777777777777/image.png", "expiresIn": 900 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: tipos aceitos: `image/jpeg` com `.jpg` ou `.jpeg`, `image/png` com `.png`, `image/webp` com `.webp`.

### `PATCH /api/hub/products/{productId}/image`

- Descrição: confirma/atualiza URL pública da imagem do produto.
- Autenticação necessária: `CONTEXT_hub` + `products:update`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: nenhum.
- Body: `imageUrl` string obrigatório, máximo 1000.
- Exemplo de requisição: `PATCH /api/hub/products/{productId}/image` com `{ "imageUrl": "https://storage.example/public/tenants/mercado-central/products/77777777-7777-7777-7777-777777777777/image.png" }`.
- Exemplo de resposta `200`: `ProductResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: URL deve pertencer ao prefixo do produto e ter extensão permitida.

### `DELETE /api/hub/products/{productId}`

- Descrição: exclui produto.
- Autenticação necessária: `CONTEXT_hub` + `products:delete`.
- Parâmetros de URL: `productId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `DELETE /api/hub/products/77777777-7777-7777-7777-777777777777`.
- Exemplo de resposta `200`: `ProductResponse` do produto removido.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: a rota retorna body, não `204`.

## Pedidos

### `GET /api/hub/orders`

- Descrição: lista pedidos.
- Autenticação necessária: `CONTEXT_hub` + `orders:read`.
- Parâmetros de URL: nenhum.
- Query params: `page` int default `0`; `size` int default `20`; `status` enum opcional (`PENDING`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED`); `search` string opcional; `dateFrom` date opcional; `dateTo` date opcional.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/orders?page=0&size=20&status=PENDING&dateFrom=2026-06-01&dateTo=2026-06-18`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "99999999-9999-9999-9999-999999999999", "orderNumber": "PED-0001", "customerName": "Maria", "customerEmail": "maria@email.com", "customerPhone": "11999999999", "status": "PENDING", "paymentStatus": "não identificado", "itemsCount": 2, "subtotal": 50.00, "discountTotal": 5.00, "deliveryFee": 8.00, "total": 53.00, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `dateFrom` deve ser menor ou igual a `dateTo`.

### `GET /api/hub/orders/{orderId}`

- Descrição: detalha pedido.
- Autenticação necessária: `CONTEXT_hub` + `orders:read`.
- Parâmetros de URL: `orderId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/orders/99999999-9999-9999-9999-999999999999`.
- Exemplo de resposta `200`: `{ "id": "99999999-9999-9999-9999-999999999999", "orderNumber": "PED-0001", "customer": { "name": "Maria", "email": "maria@email.com", "phone": "11999999999" }, "status": "PENDING", "paymentStatus": "não identificado", "items": [{ "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "productId": "77777777-7777-7777-7777-777777777777", "productName": "Arroz 5kg", "sku": "ARR-5KG", "quantity": 1, "unitPrice": 29.90, "totalPrice": 29.90 }], "subtotal": 50.00, "discountTotal": 5.00, "deliveryFee": 8.00, "total": 53.00, "deliveryAddress": "Rua A, 123", "notes": null, "cancelReason": null, "cancelledAt": null, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: pedido inexistente retorna `404`.

### `PATCH /api/hub/orders/{orderId}/status`

- Descrição: atualiza status do pedido.
- Autenticação necessária: `CONTEXT_hub` + `orders:update`; para status `CANCELLED`, exige `orders:cancel`.
- Parâmetros de URL: `orderId` UUID obrigatório.
- Query params: nenhum.
- Body: `status` enum obrigatório (`PENDING`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED`); `cancelReason` string opcional, máximo 1000.
- Exemplo de requisição: `PATCH /api/hub/orders/{orderId}/status` com `{ "status": "PREPARING", "cancelReason": null }`.
- Exemplo de resposta `200`: `{ "id": "99999999-9999-9999-9999-999999999999", "orderNumber": "PED-0001", "previousStatus": "PENDING", "status": "PREPARING", "cancelReason": null, "cancelledAt": null, "updatedAt": "2026-06-18T10:00:00Z" }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: transições permitidas: `PENDING -> PREPARING|CANCELLED`, `PREPARING -> SHIPPED|CANCELLED`, `SHIPPED -> DELIVERED`; `DELIVERED` e `CANCELLED` são finais. Estoque insuficiente retorna `400` com erro `INSUFFICIENT_STOCK` e `details`.
- Contrato de cancelamento frontend ↔ BFF ↔ Core API: o frontend envia `cancelReason` (camelCase) para o BFF (`PATCH /api/orders/{orderId}/status`), que valida com Zod e converte para `cancel_reason` (snake_case) antes de encaminhar ao Core API. O motivo é opcional no DTO, mas obrigatório no serviço quando o status é `CANCELLED` (`400 CANCEL_REASON_REQUIRED`).

## Promoções

### Campos de promoção

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `name` | string | sim | máximo 160 |
| `description` | string | não | texto livre |
| `type` | enum | sim | `PERCENTAGE`, `FIXED_AMOUNT`, `PROMOTIONAL_PRICE` |
| `scope` | enum | sim | `PRODUCTS`, `CATEGORIES` |
| `discountValue` | decimal | sim | maior que 0; se `PERCENTAGE`, máximo 100 |
| `productIds` | array UUID | condicional | obrigatório quando `scope=PRODUCTS` |
| `categoryIds` | array UUID | condicional | obrigatório quando `scope=CATEGORIES` |
| `startsAt` | OffsetDateTime | não | início da promoção |
| `endsAt` | OffsetDateTime | não | deve ser maior que `startsAt` quando ambos enviados |

### `POST /api/hub/promotions`

- Descrição: cria promoção.
- Autenticação necessária: `CONTEXT_hub` + `promotions:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: campos de promoção.
- Exemplo de requisição: `POST /api/hub/promotions` com `{ "name": "10% Bebidas", "type": "PERCENTAGE", "scope": "CATEGORIES", "discountValue": 10, "categoryIds": ["66666666-6666-6666-6666-666666666666"], "startsAt": "2026-06-18T10:00:00Z", "endsAt": "2026-06-30T23:59:59Z" }`.
- Exemplo de resposta `201`: `{ "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "name": "10% Bebidas", "description": null, "type": "PERCENTAGE", "scope": "CATEGORIES", "discountValue": 10, "active": true, "startsAt": "2026-06-18T10:00:00Z", "endsAt": "2026-06-30T23:59:59Z", "products": [], "categories": [{ "id": "66666666-6666-6666-6666-666666666666", "name": "Bebidas" }], "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: não pode enviar `productIds` e `categoryIds` juntos.

### `GET /api/hub/promotions`

- Descrição: lista promoções.
- Autenticação necessária: `CONTEXT_hub` + `promotions:read` ou `promotions:manage`.
- Parâmetros de URL: nenhum.
- Query params: `page`, `size`, `active` boolean, `type` enum, `scope` enum, `search` string.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/promotions?page=0&size=20&active=true&type=PERCENTAGE&scope=CATEGORIES&search=bebidas`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "name": "10% Bebidas", "type": "PERCENTAGE", "scope": "CATEGORIES", "discountValue": 10, "active": true, "startsAt": "2026-06-18T10:00:00Z", "endsAt": "2026-06-30T23:59:59Z", "itemsCount": 1, "createdAt": "2026-06-18T10:00:00Z" }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `itemsCount` conta produtos ou categorias conforme escopo.

### `GET /api/hub/promotions/{promotionId}`

- Descrição: detalha promoção.
- Autenticação necessária: `CONTEXT_hub` + `promotions:read` ou `promotions:manage`.
- Parâmetros de URL: `promotionId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/promotions/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`.
- Exemplo de resposta `200`: `PromotionResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: promoção removida/inexistente retorna `404`.

### `PUT /api/hub/promotions/{promotionId}`

- Descrição: atualiza promoção.
- Autenticação necessária: `CONTEXT_hub` + `promotions:manage`.
- Parâmetros de URL: `promotionId` UUID obrigatório.
- Query params: nenhum.
- Body: campos de promoção.
- Exemplo de requisição: `PUT /api/hub/promotions/{promotionId}` com `{ "name": "R$ 5 Bebidas", "type": "FIXED_AMOUNT", "scope": "CATEGORIES", "discountValue": 5, "categoryIds": ["66666666-6666-6666-6666-666666666666"] }`.
- Exemplo de resposta `200`: `PromotionResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: substitui alvos da promoção.

### `DELETE /api/hub/promotions/{promotionId}`

- Descrição: exclui promoção.
- Autenticação necessária: `CONTEXT_hub` + `promotions:manage`.
- Parâmetros de URL: `promotionId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `DELETE /api/hub/promotions/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`.
- Exemplo de resposta: `204 No Content`.
- Possíveis status HTTP: `204`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: exclusão marca a promoção como inativa/removida.

### `PATCH /api/hub/promotions/{promotionId}/status`

- Descrição: ativa ou desativa promoção.
- Autenticação necessária: `CONTEXT_hub` + `promotions:manage`.
- Parâmetros de URL: `promotionId` UUID obrigatório.
- Query params: nenhum.
- Body: `active` boolean obrigatório.
- Exemplo de requisição: `PATCH /api/hub/promotions/{promotionId}/status` com `{ "active": false }`.
- Exemplo de resposta `200`: `PromotionResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: não altera datas ou alvos.

## Cupons

### Campos de cupom

| Campo | Tipo | Obrigatório | Observações |
|---|---:|---:|---|
| `code` | string | sim | máximo 60; normalizado para maiúsculas |
| `name` | string | sim | máximo 160 |
| `description` | string | não | texto livre |
| `type` | enum | sim | `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING` |
| `discountValue` | decimal | condicional | obrigatório para `PERCENTAGE` e `FIXED_AMOUNT`; ignorado como `null` em `FREE_SHIPPING` |
| `minimumOrderValue` | decimal | não | mínimo `0.00` |
| `usageLimit` | int | não | mínimo 1 |
| `perCustomerLimit` | int | não | mínimo 1 |
| `startsAt` | OffsetDateTime | não | início |
| `endsAt` | OffsetDateTime | não | deve ser maior que `startsAt` quando ambos enviados |

### `POST /api/hub/coupons`

- Descrição: cria cupom.
- Autenticação necessária: `CONTEXT_hub` + `coupons:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: campos de cupom.
- Exemplo de requisição: `POST /api/hub/coupons` com `{ "code": "BOASVINDAS10", "name": "Boas-vindas 10%", "type": "PERCENTAGE", "discountValue": 10, "minimumOrderValue": 50, "usageLimit": 100, "perCustomerLimit": 1 }`.
- Exemplo de resposta `201`: `{ "id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "code": "BOASVINDAS10", "name": "Boas-vindas 10%", "description": null, "type": "PERCENTAGE", "discountValue": 10, "minimumOrderValue": 50, "usageLimit": 100, "usageCount": 0, "perCustomerLimit": 1, "active": true, "startsAt": null, "endsAt": null, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `409`, `500`.
- Observações importantes: código duplicado retorna `409`.

### `GET /api/hub/coupons`

- Descrição: lista cupons.
- Autenticação necessária: `CONTEXT_hub` + `coupons:read` ou `coupons:manage`.
- Parâmetros de URL: nenhum.
- Query params: `page`, `size`, `active` boolean, `type` enum, `search` string.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/coupons?page=0&size=20&active=true&type=PERCENTAGE&search=boas`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "code": "BOASVINDAS10", "name": "Boas-vindas 10%", "type": "PERCENTAGE", "discountValue": 10, "minimumOrderValue": 50, "usageLimit": 100, "usageCount": 0, "active": true, "startsAt": null, "endsAt": null, "createdAt": "2026-06-18T10:00:00Z" }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `search` é normalizado por trim.

### `GET /api/hub/coupons/{couponId}`

- Descrição: detalha cupom.
- Autenticação necessária: `CONTEXT_hub` + `coupons:read` ou `coupons:manage`.
- Parâmetros de URL: `couponId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/coupons/cccccccc-cccc-cccc-cccc-cccccccccccc`.
- Exemplo de resposta `200`: `CouponResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: cupom removido/inexistente retorna `404`.

### `PUT /api/hub/coupons/{couponId}`

- Descrição: atualiza cupom.
- Autenticação necessária: `CONTEXT_hub` + `coupons:manage`.
- Parâmetros de URL: `couponId` UUID obrigatório.
- Query params: nenhum.
- Body: campos de cupom.
- Exemplo de requisição: `PUT /api/hub/coupons/{couponId}` com `{ "code": "BOASVINDAS15", "name": "Boas-vindas 15%", "type": "PERCENTAGE", "discountValue": 15, "minimumOrderValue": 50, "usageLimit": 100, "perCustomerLimit": 1 }`.
- Exemplo de resposta `200`: `CouponResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Observações importantes: valida as mesmas regras de criação.

### `DELETE /api/hub/coupons/{couponId}`

- Descrição: exclui cupom.
- Autenticação necessária: `CONTEXT_hub` + `coupons:manage`.
- Parâmetros de URL: `couponId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `DELETE /api/hub/coupons/cccccccc-cccc-cccc-cccc-cccccccccccc`.
- Exemplo de resposta: `204 No Content`.
- Possíveis status HTTP: `204`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: exclusão marca cupom como inativo/removido.

### `PATCH /api/hub/coupons/{couponId}/status`

- Descrição: ativa ou desativa cupom.
- Autenticação necessária: `CONTEXT_hub` + `coupons:manage`.
- Parâmetros de URL: `couponId` UUID obrigatório.
- Query params: nenhum.
- Body: `active` boolean obrigatório.
- Exemplo de requisição: `PATCH /api/hub/coupons/{couponId}/status` com `{ "active": false }`.
- Exemplo de resposta `200`: `CouponResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: não altera limites, datas ou tipo.

### `POST /api/hub/coupons/validate`

- Descrição: valida código de cupom para subtotal/frete.
- Autenticação necessária: `CONTEXT_hub` + `coupons:read` ou `coupons:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `code` string obrigatório, máximo 60; `subtotal` decimal obrigatório, mínimo `0.00`; `deliveryFee` decimal obrigatório, mínimo `0.00`; `customerEmail` string/email opcional, máximo 160.
- Exemplo de requisição: `POST /api/hub/coupons/validate` com `{ "code": "BOASVINDAS10", "subtotal": 100, "deliveryFee": 8, "customerEmail": "maria@email.com" }`.
- Exemplo de resposta `200` válido: `{ "valid": true, "coupon": { "id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "code": "BOASVINDAS10", "name": "Boas-vindas 10%", "type": "PERCENTAGE" }, "discountAmount": 10, "deliveryDiscount": 0, "finalTotal": 98, "reason": null, "message": null }`.
- Exemplo de resposta `200` inválido: `{ "valid": false, "coupon": null, "discountAmount": null, "deliveryDiscount": null, "finalTotal": null, "reason": "COUPON_EXPIRED", "message": "Cupom expirado." }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `500`.
- Observações importantes: motivos possíveis: `COUPON_NOT_FOUND`, `COUPON_INACTIVE`, `COUPON_NOT_STARTED`, `COUPON_EXPIRED`, `USAGE_LIMIT_REACHED`, `CUSTOMER_USAGE_LIMIT_REACHED`, `MINIMUM_ORDER_VALUE_NOT_REACHED`.

## Loja

### `GET /api/hub/store-info`

- Descrição: obtém dados comerciais da loja.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/store-info`.
- Exemplo de resposta `200`: `{ "id": "dddddddd-dddd-dddd-dddd-dddddddddddd", "displayName": "Mercado Central", "description": "Mercado de bairro", "logoUrl": null, "bannerUrl": null, "phone": "1133333333", "whatsapp": "11999999999", "instagram": "@mercado", "facebook": null, "website": "https://mercado.example", "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }`.
- Possíveis status HTTP: `200`, `401`, `403`, `404`, `500`.
- Observações importantes: se não existir registro, o serviço retorna `null`.

### `PUT /api/hub/store-info`

- Descrição: atualiza dados comerciais da loja.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `displayName` string opcional máximo 160; `description` string opcional; `logoUrl` string opcional; `bannerUrl` string opcional; `phone` string opcional máximo 40; `whatsapp` string opcional máximo 40; `instagram` string opcional máximo 160; `facebook` string opcional máximo 160; `website` string opcional máximo 255.
- Exemplo de requisição: `PUT /api/hub/store-info` com `{ "displayName": "Mercado Central", "description": "Mercado de bairro", "phone": "1133333333", "whatsapp": "11999999999", "website": "https://mercado.example" }`.
- Exemplo de resposta `200`: `StoreInfoResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: strings em branco são convertidas para `null`.

### `GET /api/hub/addresses`

- Descrição: lista endereços do mercado.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/addresses`.
- Exemplo de resposta `200`: `[{ "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "label": "Matriz", "street": "Rua A", "number": "123", "complement": null, "neighborhood": "Centro", "city": "São Paulo", "state": "SP", "zipCode": "01000-000", "lat": null, "lng": null, "primary": true, "fiscal": true, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }]`.
- Possíveis status HTTP: `200`, `401`, `403`, `404`, `500`.
- Observações importantes: ordena primário/fiscal primeiro, depois criação ascendente.

### `POST /api/hub/addresses`

- Descrição: cria endereço do mercado.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: nenhum.
- Query params: nenhum.
- Body: `label` string opcional máximo 80; `street` string obrigatório máximo 180; `number` string obrigatório máximo 40; `complement` string opcional máximo 120; `neighborhood` string obrigatório máximo 120; `city` string obrigatório máximo 120; `state` string obrigatório máximo 2; `zipCode` string obrigatório máximo 20; `lat` decimal opcional; `lng` decimal opcional; `primary` boolean opcional; `fiscal` boolean opcional.
- Exemplo de requisição: `POST /api/hub/addresses` com `{ "label": "Matriz", "street": "Rua A", "number": "123", "neighborhood": "Centro", "city": "São Paulo", "state": "SP", "zipCode": "01000-000", "primary": true, "fiscal": true }`.
- Exemplo de resposta `201`: `StoreAddressResponse`.
- Possíveis status HTTP: `201`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `state` é normalizado para maiúsculas e deve ter 2 caracteres; se for primeiro endereço, vira primário automaticamente.

### `GET /api/hub/addresses/{addressId}`

- Descrição: detalha endereço.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: `addressId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/addresses/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`.
- Exemplo de resposta `200`: `StoreAddressResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: endereço inexistente retorna `404` com erro `ADDRESS_NOT_FOUND`.

### `PUT /api/hub/addresses/{addressId}`

- Descrição: atualiza endereço.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: `addressId` UUID obrigatório.
- Query params: nenhum.
- Body: mesmos campos de criação de endereço.
- Exemplo de requisição: `PUT /api/hub/addresses/{addressId}` com `{ "label": "Matriz", "street": "Rua B", "number": "456", "neighborhood": "Centro", "city": "São Paulo", "state": "SP", "zipCode": "01000-000", "primary": true }`.
- Exemplo de resposta `200`: `StoreAddressResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: se `primary=true` ou `fiscal=true`, limpa o marcador dos demais endereços.

### `DELETE /api/hub/addresses/{addressId}`

- Descrição: exclui endereço.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: `addressId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `DELETE /api/hub/addresses/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`.
- Exemplo de resposta `200`: `StoreAddressResponse` do endereço removido.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: a rota retorna body, não `204`.

### `GET /api/hub/addresses/{addressId}/business-hours`

- Descrição: lista horários de funcionamento de um endereço.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: `addressId` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/addresses/{addressId}/business-hours`.
- Exemplo de resposta `200`: `[{ "id": "ffffffff-ffff-ffff-ffff-ffffffffffff", "addressId": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "dayOfWeek": 1, "opensAt": "08:00:00", "closesAt": "18:00:00", "closed": false, "createdAt": "2026-06-18T10:00:00Z", "updatedAt": "2026-06-18T10:00:00Z" }]`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `dayOfWeek` aceita `1` a `7`.

### `PUT /api/hub/addresses/{addressId}/business-hours`

- Descrição: substitui todos os horários de funcionamento do endereço.
- Autenticação necessária: `CONTEXT_hub` + `settings:manage`.
- Parâmetros de URL: `addressId` UUID obrigatório.
- Query params: nenhum.
- Body: `businessHours` array obrigatório; item com `dayOfWeek` int obrigatório `1..7`, `opensAt` local time opcional, `closesAt` local time opcional, `closed` boolean opcional.
- Exemplo de requisição: `PUT /api/hub/addresses/{addressId}/business-hours` com `{ "businessHours": [{ "dayOfWeek": 1, "opensAt": "08:00:00", "closesAt": "18:00:00", "closed": false }, { "dayOfWeek": 7, "closed": true }] }`.
- Exemplo de resposta `200`: array de `BusinessHourResponse`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `dayOfWeek` deve ser único por endereço; se `closed` não for `true`, `opensAt` e `closesAt` são obrigatórios.

## Logs/Auditoria

### `GET /api/hub/activity-logs`

- Descrição: lista logs de atividade do tenant.
- Autenticação necessária: `CONTEXT_hub` + `activity_logs:read` ou `audit:read`.
- Parâmetros de URL: nenhum.
- Query params: `page` int default `0`; `size` int default `20`; `action` string opcional; `entity` string opcional; `entityId` UUID opcional; `performedByUserId` UUID opcional; `dateFrom` date opcional; `dateTo` date opcional; `search` string opcional.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/activity-logs?page=0&size=20&entity=PRODUCT&dateFrom=2026-06-01&dateTo=2026-06-18`.
- Exemplo de resposta `200`: `{ "content": [{ "id": "12121212-1212-1212-1212-121212121212", "action": "PRODUCT_CREATED", "entity": "PRODUCT", "entityId": "77777777-7777-7777-7777-777777777777", "description": "não identificado", "performedBy": { "id": "22222222-2222-2222-2222-222222222222", "name": "Ana Souza", "email": "ana@mercado.com" }, "metadata": {}, "ipAddress": "127.0.0.1", "userAgent": "Mozilla/5.0", "createdAt": "2026-06-18T10:00:00Z" }], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: `size` deve ser entre `1` e `100`; `dateFrom` deve ser menor ou igual a `dateTo`.

### `GET /api/hub/activity-logs/{id}`

- Descrição: detalha log de atividade.
- Autenticação necessária: `CONTEXT_hub` + `activity_logs:read` ou `audit:read`.
- Parâmetros de URL: `id` UUID obrigatório.
- Query params: nenhum.
- Body: não se aplica.
- Exemplo de requisição: `GET /api/hub/activity-logs/12121212-1212-1212-1212-121212121212`.
- Exemplo de resposta `200`: `{ "id": "12121212-1212-1212-1212-121212121212", "action": "PRODUCT_CREATED", "entity": "PRODUCT", "entityId": "77777777-7777-7777-7777-777777777777", "description": "não identificado", "performedBy": { "id": "22222222-2222-2222-2222-222222222222", "name": "Ana Souza", "email": "ana@mercado.com" }, "metadata": {}, "ipAddress": "127.0.0.1", "userAgent": "Mozilla/5.0", "createdAt": "2026-06-18T10:00:00Z" }`.
- Possíveis status HTTP: `200`, `400`, `401`, `403`, `404`, `500`.
- Observações importantes: log inexistente retorna `404` com erro `ACTIVITY_LOG_NOT_FOUND`.
