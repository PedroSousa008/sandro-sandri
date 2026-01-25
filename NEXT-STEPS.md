# 🚀 Próximos Passos - Implementação de Segurança

## ✅ O que já foi feito

- ✅ Senha hardcoded removida do frontend
- ✅ Sistema JWT implementado
- ✅ Armazenamento de senhas em texto plano removido
- ✅ Rotas admin protegidas com autenticação
- ✅ Frontend atualizado para usar tokens JWT

## 📋 Checklist de Implementação

### 1. Instalar Dependência (Local)

Execute no terminal:

```bash
npm install jsonwebtoken
```

Ou se estiver usando yarn:

```bash
yarn add jsonwebtoken
```

### 2. Gerar JWT_SECRET

Execute este comando para gerar um secret seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Copie o resultado** - você precisará dele no próximo passo.

### 3. Configurar Variáveis de Ambiente no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto "sandro-sandri"
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

#### Obrigatório:
- **Name**: `JWT_SECRET`
- **Value**: Cole o valor gerado no passo 2
- **Environment**: Production, Preview, Development (marque todos)

#### Opcional (mas recomendado):
- **Name**: `OWNER_PASSWORD_HASH`
- **Value**: Hash bcrypt da senha do owner
  - Para gerar: Execute `node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('SUA_SENHA_AQUI', 10).then(h => console.log(h))"`
  - Substitua `SUA_SENHA_AQUI` pela senha real do owner
- **Environment**: Production, Preview, Development

### 4. Fazer Commit e Push

```bash
git add .
git commit -m "Security: Implement JWT authentication, remove hardcoded passwords, protect admin routes"
git push origin main
```

### 5. Verificar Deploy no Vercel

1. Vercel fará deploy automaticamente após o push
2. Aguarde o deploy completar
3. Verifique os logs para garantir que não há erros

### 6. Testar a Implementação

#### Teste 1: Login do Owner
1. Acesse `/login.html`
2. Email: `sandrosandri.bysousa@gmail.com`
3. Senha: (sua senha atual)
4. Security Answer: `10.09.2025`
5. ✅ Deve fazer login com sucesso

#### Teste 2: Login de Usuário Regular
1. Acesse `/login.html`
2. Use credenciais de um usuário existente
3. ✅ Deve fazer login com sucesso

#### Teste 3: Acesso Admin (sem login)
1. Tente acessar `/admin.html` sem estar logado
2. ✅ Deve redirecionar para login ou mostrar erro

#### Teste 4: API Admin Protegida
1. Tente acessar `/api/admin?endpoint=customers` sem token
2. ✅ Deve retornar 401/403 Unauthorized

#### Teste 5: Commerce Mode Protegido
1. Faça login como owner
2. Tente mudar o commerce mode
3. ✅ Deve funcionar apenas se estiver autenticado como owner

### 7. Verificar Logs (se houver problemas)

Se encontrar erros, verifique:

1. **Vercel Logs**: Dashboard → Deployments → Latest → Functions → Logs
2. **Console do Navegador**: F12 → Console
3. **Network Tab**: F12 → Network → Verifique requisições falhando

## ⚠️ Problemas Comuns e Soluções

### Erro: "JWT_SECRET not set"
- **Solução**: Configure `JWT_SECRET` nas variáveis de ambiente do Vercel

### Erro: "jsonwebtoken module not found"
- **Solução**: Execute `npm install jsonwebtoken` localmente e faça commit do `package.json`

### Erro: "Unauthorized" ao acessar admin
- **Solução**: Certifique-se de estar logado como owner e que o token JWT está sendo enviado

### Erro: "Owner account not properly configured"
- **Solução**: Configure `OWNER_PASSWORD_HASH` ou faça login uma vez para criar o hash automaticamente

## 📝 Notas Importantes

1. **Primeira vez**: Se o owner nunca fez login antes, o sistema tentará criar um hash. Se `OWNER_PASSWORD_HASH` não estiver configurado, você verá um aviso. Configure a variável de ambiente para evitar isso.

2. **Senhas antigas**: Usuários existentes com senhas em texto plano precisarão fazer login uma vez para migrar para hash. Após o primeiro login, a senha será hasheada automaticamente.

3. **Tokens expiram**: Tokens JWT expiram após 24 horas. Usuários precisarão fazer login novamente.

4. **Cookies**: O sistema usa cookies HTTP-only para maior segurança, mas também armazena o token no localStorage para chamadas de API.

## 🔒 Segurança Adicional (Opcional - Futuro)

Estas melhorias podem ser implementadas depois:

- [ ] Rate limiting para login/signup
- [ ] CSRF protection
- [ ] Password reset functionality
- [ ] 2FA para owner account
- [ ] Logging de ações admin
- [ ] Monitoramento de tentativas de login falhadas

## ✅ Quando tudo estiver funcionando

1. ✅ Login funciona para owner e usuários
2. ✅ Admin routes estão protegidas
3. ✅ Senhas não aparecem em nenhum lugar
4. ✅ Commerce mode só pode ser alterado pelo owner
5. ✅ Delete de clientes requer autenticação

**Parabéns! Seu site está seguro! 🎉**

