# 🔒 Resumo de Segurança - Sandro Sandri E-commerce

## 📋 Índice
1. [Autenticação](#autenticação)
2. [Rotas API Sensíveis](#rotas-api-sensíveis)
3. [Variáveis de Ambiente](#variáveis-de-ambiente)
4. [Controle de Permissões](#controle-de-permissões)
5. [Recomendações de Segurança](#recomendações-de-segurança)

---

## 🔐 Autenticação

### Sistema de Autenticação Atual

**Localização:** `js/auth.js`, `api/auth/login.js`, `api/auth/signup.js`

**Método:**
- **Frontend:** Autenticação baseada em `localStorage` com sessão de 24 horas
- **Backend:** Verificação de senha usando `bcryptjs` (hash bcrypt)
- **Owner Account:** Autenticação especial com pergunta de segurança adicional

### Fluxo de Autenticação

1. **Signup (`/api/auth/signup`):**
   - Validação de email e senha (mínimo 6 caracteres)
   - Hash da senha com `bcryptjs` (10 rounds)
   - Armazenamento de `passwordHash` no servidor
   - ⚠️ **ATENÇÃO:** Senha em texto plano também é armazenada para acesso do admin (`user.password`)
   - Email verification temporariamente desabilitado

2. **Login (`/api/auth/login`):**
   - Verificação de email normalizado (lowercase)
   - Comparação de senha usando `bcrypt.compare()`
   - Migração automática de usuários legados (senha em texto plano → hash)
   - Atualização de `lastLogin` timestamp
   - ⚠️ **ATENÇÃO:** Senha em texto plano é salva após login para acesso do admin

3. **Owner Account (`sandrosandri.bysousa@gmail.com`):**
   - Autenticação especial no frontend (`js/auth.js`)
   - Senha hardcoded: `pmpcsousa10` ⚠️ **RISCO DE SEGURANÇA**
   - Pergunta de segurança adicional: "Relationship date?" → Resposta: `10.09.2025`
   - Validação no frontend e backend

### ⚠️ Problemas de Segurança Identificados

1. **Senha do Owner Hardcoded:**
   - Localização: `js/auth.js` linha 8
   - Risco: Senha visível no código JavaScript (pode ser inspecionada no navegador)
   - Impacto: ALTO - Acesso total ao sistema admin

2. **Senhas em Texto Plano Armazenadas:**
   - Localização: `api/auth/login.js`, `api/auth/signup.js`
   - Motivo: Acesso do admin para visualizar senhas dos clientes
   - Risco: Se o banco de dados for comprometido, todas as senhas estarão expostas
   - Impacto: CRÍTICO - Violação de privacidade e segurança

3. **Autenticação do Owner via Header:**
   - Localização: `api/site-settings/commerce-mode.js`
   - Método: Verificação via `X-Owner-Email` header ou `body.ownerEmail`
   - Risco: Qualquer pessoa pode enviar o header com o email do owner
   - Impacto: ALTO - Permite alteração do modo de comércio sem autenticação real

4. **Sessões no localStorage:**
   - Localização: `js/auth.js`
   - Risco: Vulnerável a XSS (Cross-Site Scripting)
   - Impacto: MÉDIO - Se houver vulnerabilidade XSS, tokens podem ser roubados

---

## 🛡️ Rotas API Sensíveis

### Rotas que Requerem Autenticação

#### 1. **`/api/site-settings/commerce-mode` (POST)**
- **Método:** POST
- **Autenticação:** Owner apenas
- **Verificação:** `verifyOwner(req)` - verifica email via header/body
- **Proteção:** ⚠️ **FRACA** - Apenas verifica email, não senha/token
- **Ação:** Altera modo de comércio (LIVE/WAITLIST/EARLY_ACCESS)
- **Risco:** Qualquer pessoa pode enviar requisição com email do owner

#### 2. **`/api/admin?endpoint=customers` (DELETE)**
- **Método:** DELETE
- **Autenticação:** Owner apenas (verificação no frontend)
- **Verificação:** ⚠️ **APENAS NO FRONTEND** - `admin.html` verifica `window.auth.isOwner()`
- **Proteção:** ⚠️ **MUITO FRACA** - Sem verificação no backend
- **Ação:** Deleta cliente e todos os dados associados
- **Risco:** ALTO - Requisição direta pode deletar qualquer cliente

#### 3. **`/api/admin?endpoint=activity` (POST)**
- **Método:** POST
- **Autenticação:** Nenhuma (pública)
- **Ação:** Registra atividade do usuário
- **Risco:** BAIXO - Apenas grava dados de atividade

#### 4. **`/api/admin?endpoint=customers` (GET)**
- **Método:** GET
- **Autenticação:** ⚠️ **NENHUMA** - Pública
- **Ação:** Retorna todos os dados dos clientes (incluindo senhas em texto plano)
- **Risco:** **CRÍTICO** - Qualquer pessoa pode acessar todos os dados dos clientes
- **Dados Expostos:**
  - Email
  - Senha em texto plano
  - Perfil completo
  - Histórico de pedidos
  - Endereços
  - Métodos de pagamento
  - Favoritos

#### 5. **`/api/checkout/create-session` (POST)**
- **Método:** POST
- **Autenticação:** Nenhuma (pública)
- **Validação:** Verifica inventário e modo de comércio
- **Ação:** Cria sessão de checkout Stripe
- **Risco:** MÉDIO - Pode ser usado para criar sessões de checkout sem validação adequada

#### 6. **`/api/webhooks/stripe` (POST)**
- **Método:** POST
- **Autenticação:** Verificação de assinatura Stripe
- **Validação:** ✅ **FORTE** - Verifica assinatura do webhook usando `stripe.webhooks.constructEvent()`
- **Ação:** Processa pagamentos confirmados
- **Risco:** BAIXO - Protegido por assinatura Stripe

#### 7. **`/api/user/sync` (POST)**
- **Método:** POST
- **Autenticação:** ⚠️ **FRACA** - Apenas verifica email no body
- **Ação:** Sincroniza dados do usuário (cart, profile, favorites, orders)
- **Risco:** MÉDIO - Qualquer pessoa pode enviar dados para qualquer email

#### 8. **`/api/auth/login` (POST)**
- **Método:** POST
- **Autenticação:** Validação de credenciais
- **Validação:** ✅ **FORTE** - Verifica senha com bcrypt
- **Risco:** BAIXO - Protegido por validação de senha

#### 9. **`/api/auth/signup` (POST)**
- **Método:** POST
- **Autenticação:** Nenhuma (pública)
- **Validação:** Valida formato de email e senha
- **Risco:** BAIXO - Apenas cria contas

---

## 🔑 Variáveis de Ambiente

### Variáveis Críticas (Secretas)

#### 1. **`STRIPE_SECRET_KEY`**
- **Uso:** `api/checkout/create-session.js`, `api/webhooks/stripe.js`
- **Propósito:** Autenticação com Stripe API
- **Risco:** CRÍTICO - Permite criar sessões de checkout e processar pagamentos
- **Status:** ✅ Deve estar configurada no Vercel

#### 2. **`STRIPE_WEBHOOK_SECRET`**
- **Uso:** `api/webhooks/stripe.js`
- **Propósito:** Verificação de assinatura de webhooks do Stripe
- **Risco:** CRÍTICO - Sem isso, webhooks podem ser falsificados
- **Status:** ✅ Deve estar configurada no Vercel

#### 3. **`KV_REST_API_URL` / `UPSTASH_REDIS_KV_REST_API_URL`**
- **Uso:** `lib/storage.js`
- **Propósito:** Conexão com Vercel KV (Redis)
- **Risco:** ALTO - Acesso total ao banco de dados
- **Status:** ✅ Deve estar configurada no Vercel

#### 4. **`KV_REST_API_TOKEN` / `UPSTASH_REDIS_KV_REST_API_TOKEN`**
- **Uso:** `lib/storage.js`
- **Propósito:** Token de autenticação para Vercel KV
- **Risco:** CRÍTICO - Acesso total ao banco de dados
- **Status:** ✅ Deve estar configurada no Vercel

#### 5. **`RESEND_API_KEY`**
- **Uso:** `lib/email.js`
- **Propósito:** Envio de emails via Resend
- **Risco:** MÉDIO - Pode enviar emails em nome do sistema
- **Status:** ✅ Deve estar configurada no Vercel

### Variáveis Públicas (Não Secretas)

#### 6. **`SITE_URL`**
- **Uso:** `api/checkout/create-session.js`
- **Propósito:** URL do site para redirects
- **Risco:** BAIXO - Informação pública

#### 7. **`APP_URL`**
- **Uso:** `lib/email.js`
- **Propósito:** URL base para links de verificação de email
- **Risco:** BAIXO - Informação pública

#### 8. **`SHIPPING_FLAT_RATE`**
- **Uso:** `api/checkout/create-session.js`
- **Propósito:** Taxa de envio padrão
- **Risco:** BAIXO - Configuração pública

#### 9. **`RESEND_FROM_EMAIL`**
- **Uso:** `lib/email.js`
- **Propósito:** Email remetente (opcional)
- **Risco:** BAIXO - Informação pública

#### 10. **`VERCEL_URL`**
- **Uso:** `lib/email.js`
- **Propósito:** URL automática do Vercel
- **Risco:** BAIXO - Informação pública

---

## 🚨 Controle de Permissões

### Frontend (Client-Side)

#### 1. **Owner Mode (`js/auth.js`)**
- **Verificação:** `window.auth.isOwner()`
- **Localização:** `admin.html`, `js/admin.js`
- **Proteção:** ⚠️ **FRACA** - Apenas verifica localStorage
- **Risco:** Qualquer pessoa pode modificar localStorage e acessar admin

**Locais de Verificação:**
- `admin.html` linha 321: `if (!window.auth || !window.auth.isOwner())`
- `js/admin.js` linhas 56, 123, 146, 358, 370: Verificações de owner

#### 2. **User Authentication (`js/auth.js`)**
- **Verificação:** `window.auth.currentUser`
- **Localização:** Múltiplos arquivos
- **Proteção:** ⚠️ **FRACA** - Baseada em localStorage
- **Risco:** Vulnerável a manipulação de localStorage

### Backend (Server-Side)

#### 1. **Owner Verification (`api/site-settings/commerce-mode.js`)**
- **Função:** `verifyOwner(req)`
- **Método:** Verifica email via header `X-Owner-Email` ou `body.ownerEmail`
- **Proteção:** ⚠️ **MUITO FRACA** - Apenas verifica email, não senha/token
- **Risco:** Qualquer pessoa pode enviar requisição com email do owner

#### 2. **Admin API (`api/admin/index.js`)**
- **Endpoint:** `/api/admin?endpoint=customers` (DELETE)
- **Proteção:** ⚠️ **NENHUMA** - Sem verificação no backend
- **Risco:** CRÍTICO - Qualquer pessoa pode deletar clientes

#### 3. **Customer Data Access (`api/admin/index.js`)**
- **Endpoint:** `/api/admin?endpoint=customers` (GET)
- **Proteção:** ⚠️ **NENHUMA** - Público
- **Risco:** CRÍTICO - Todos os dados dos clientes são públicos

#### 4. **Stripe Webhook (`api/webhooks/stripe.js`)**
- **Proteção:** ✅ **FORTE** - Verificação de assinatura Stripe
- **Método:** `stripe.webhooks.constructEvent(body, sig, webhookSecret)`
- **Risco:** BAIXO - Protegido por assinatura criptográfica

#### 5. **User Sync (`api/user/sync.js`)**
- **Proteção:** ⚠️ **FRACA** - Apenas verifica email no body
- **Risco:** MÉDIO - Qualquer pessoa pode sincronizar dados para qualquer email

---

## ⚠️ Recomendações de Segurança Críticas

### 🔴 Prioridade ALTA (Implementar Imediatamente)

1. **Remover Senha Hardcoded do Owner:**
   - Mover autenticação do owner para backend
   - Usar JWT tokens ou sessões seguras
   - Nunca armazenar senhas em código JavaScript

2. **Implementar Autenticação Real no Backend:**
   - Criar sistema de tokens JWT
   - Verificar tokens em todas as rotas sensíveis
   - Não confiar apenas em headers/body para autenticação

3. **Proteger Rota de Dados dos Clientes:**
   - Adicionar autenticação obrigatória em `/api/admin?endpoint=customers` (GET)
   - Verificar token JWT do owner
   - Retornar 403 se não autenticado

4. **Proteger Rota de Deletar Cliente:**
   - Adicionar verificação de autenticação no backend
   - Não confiar apenas no frontend

5. **Remover Armazenamento de Senhas em Texto Plano:**
   - ⚠️ **CRÍTICO:** Senhas não devem ser armazenadas em texto plano
   - Se necessário para admin, usar criptografia adicional
   - Considerar sistema de "view password" temporário

### 🟡 Prioridade MÉDIA

6. **Implementar Rate Limiting:**
   - Limitar tentativas de login
   - Limitar requisições de API
   - Prevenir brute force attacks

7. **Melhorar Verificação de Webhook:**
   - Já está bem implementado, mas verificar se `STRIPE_WEBHOOK_SECRET` está configurado

8. **Implementar CSRF Protection:**
   - Adicionar tokens CSRF para ações sensíveis
   - Proteger contra Cross-Site Request Forgery

9. **Melhorar Validação de Input:**
   - Validar todos os inputs do usuário
   - Sanitizar dados antes de armazenar
   - Prevenir SQL injection (se migrar para SQL)

### 🟢 Prioridade BAIXA

10. **Implementar Logging de Segurança:**
    - Registrar tentativas de acesso não autorizadas
    - Monitorar atividades suspeitas
    - Alertas para ações críticas

11. **Implementar 2FA (Two-Factor Authentication):**
    - Especialmente para conta do owner
    - Aumentar segurança significativamente

12. **Migrar de localStorage para httpOnly Cookies:**
    - Reduzir risco de XSS
    - Tokens mais seguros

---

## 📊 Resumo de Vulnerabilidades

| Vulnerabilidade | Severidade | Localização | Status |
|-----------------|------------|-------------|--------|
| Senha hardcoded do owner | 🔴 CRÍTICA | `js/auth.js:8` | ⚠️ Exposta |
| Senhas em texto plano | 🔴 CRÍTICA | `api/auth/*.js` | ⚠️ Armazenadas |
| API de clientes pública | 🔴 CRÍTICA | `api/admin/index.js` | ⚠️ Sem proteção |
| Deletar cliente sem auth | 🔴 CRÍTICA | `api/admin/index.js` | ⚠️ Sem proteção |
| Verificação owner fraca | 🟡 ALTA | `api/site-settings/commerce-mode.js` | ⚠️ Apenas email |
| Autenticação no localStorage | 🟡 ALTA | `js/auth.js` | ⚠️ Vulnerável a XSS |
| User sync sem validação | 🟡 MÉDIA | `api/user/sync.js` | ⚠️ Apenas email |
| Webhook Stripe | 🟢 BAIXA | `api/webhooks/stripe.js` | ✅ Protegido |

---

## ✅ Pontos Positivos de Segurança

1. **Hash de Senhas:** ✅ Usa bcryptjs para hash de senhas
2. **Webhook Stripe:** ✅ Verificação de assinatura implementada corretamente
3. **Validação de Input:** ✅ Validação básica de email e senha
4. **CORS Configurado:** ✅ CORS configurado nas APIs
5. **Idempotência:** ✅ Webhooks têm proteção contra duplicação

---

**Última Atualização:** 2024
**Versão do Documento:** 1.0

