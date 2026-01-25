# 📖 Guia Passo a Passo - Implementação de Segurança

## 🎯 O que vamos fazer?

Vamos configurar a segurança do seu site. São **4 passos principais**:

1. ✅ **Instalar o pacote jsonwebtoken** (já está no package.json, só precisa fazer deploy)
2. 🔑 **Gerar uma chave secreta (JWT_SECRET)**
3. ⚙️ **Configurar no Vercel** (adicionar a chave secreta)
4. 🚀 **Fazer deploy** (push para GitHub)

---

## 📍 PASSO 1: Entender o que já foi feito

✅ **Já está feito automaticamente:**
- Código de segurança implementado
- `package.json` atualizado com `jsonwebtoken`
- Arquivos de segurança criados

**Você não precisa fazer nada neste passo!** Apenas saiba que já está pronto.

---

## 📍 PASSO 2: Gerar a Chave Secreta (JWT_SECRET)

### O que é?
Uma chave secreta que o sistema usa para criar e verificar tokens de autenticação. É como uma senha mestre.

### Como gerar?

**Opção A: Se você tem Node.js instalado no seu computador**

1. Abra o **Terminal** (no Mac: Cmd + Espaço, digite "Terminal")
2. Navegue até a pasta do projeto:
   ```bash
   cd "/Users/pedrocastrosousa/Desktop/Sousa/Sandro Sandri/Sandro Sandri Website"
   ```
3. Execute este comando:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. **Copie o resultado** (será uma longa string de letras e números)
   - Exemplo: `a1b2c3d4e5f6...` (muito mais longo)

**Opção B: Se você NÃO tem Node.js instalado**

1. Acesse: https://randomkeygen.com/
2. Vá até a seção **"CodeIgniter Encryption Keys"**
3. Copie uma das chaves geradas (a primeira já serve)
   - Exemplo: `a1B2c3D4e5F6...`

**Opção C: Gerar online**

1. Acesse: https://generate-secret.vercel.app/64
2. Clique em "Generate"
3. Copie o resultado

### ✅ Resultado esperado:
Você deve ter uma string longa de letras e números, algo como:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**⚠️ IMPORTANTE:** Guarde esta chave! Você vai precisar dela no próximo passo.

---

## 📍 PASSO 3: Configurar no Vercel

### O que vamos fazer?
Adicionar a chave secreta que você gerou nas configurações do Vercel, para que o site possa usá-la.

### Passo a passo:

1. **Acesse o Vercel:**
   - Abra seu navegador
   - Vá para: https://vercel.com/dashboard
   - Faça login se necessário

2. **Encontre seu projeto:**
   - Na lista de projetos, encontre **"sandro-sandri"** (ou o nome do seu projeto)
   - Clique nele

3. **Acesse as configurações:**
   - No topo da página, clique na aba **"Settings"**
   - No menu lateral esquerdo, clique em **"Environment Variables"**

4. **Adicionar a variável:**
   - Clique no botão **"Add New"** ou **"Add"**
   - Preencha os campos:
     - **Key (Nome):** Digite exatamente: `JWT_SECRET`
     - **Value (Valor):** Cole a chave que você gerou no Passo 2
     - **Environment (Ambiente):** 
       - ✅ Marque **Production**
       - ✅ Marque **Preview**  
       - ✅ Marque **Development**
       - (Marque todos os três!)

5. **Salvar:**
   - Clique em **"Save"** ou **"Add"**

### ✅ Como verificar se funcionou:
- Você deve ver `JWT_SECRET` na lista de variáveis de ambiente
- Deve aparecer com um ícone de cadeado 🔒 (indicando que está oculto por segurança)

### 📸 Onde fica cada coisa:
```
Vercel Dashboard
  └── Seu Projeto (sandro-sandri)
      └── Settings (aba no topo)
          └── Environment Variables (menu lateral)
              └── Add New (botão)
                  └── Preencher: Key, Value, Environment
```

---

## 📍 PASSO 4: Fazer Deploy (Enviar para o GitHub)

### O que vamos fazer?
Enviar todas as mudanças de segurança para o GitHub, que automaticamente fará deploy no Vercel.

### Passo a passo:

1. **Abrir o Terminal:**
   - No Mac: Pressione `Cmd + Espaço`
   - Digite "Terminal"
   - Pressione Enter

2. **Navegar até a pasta do projeto:**
   ```bash
   cd "/Users/pedrocastrosousa/Desktop/Sousa/Sandro Sandri/Sandro Sandri Website"
   ```
   - Pressione Enter

3. **Verificar o que vai ser enviado:**
   ```bash
   git status
   ```
   - Isso mostra todos os arquivos modificados
   - Você deve ver vários arquivos listados

4. **Adicionar todos os arquivos:**
   ```bash
   git add .
   ```
   - Isso prepara todos os arquivos para serem enviados
   - Não deve aparecer nenhuma mensagem de erro

5. **Fazer commit (salvar localmente):**
   ```bash
   git commit -m "Security: Implement JWT authentication, remove hardcoded passwords, protect admin routes"
   ```
   - Isso salva as mudanças localmente
   - Você deve ver uma mensagem como: "15 files changed"

6. **Enviar para o GitHub:**
   ```bash
   git push origin main
   ```
   - Isso envia tudo para o GitHub
   - Pode pedir suas credenciais do GitHub
   - Aguarde até ver "Everything up-to-date" ou uma mensagem de sucesso

### ✅ Como verificar se funcionou:
1. Acesse seu repositório no GitHub: https://github.com/PedroSousa008/sandro-sandri
2. Você deve ver o commit mais recente com a mensagem sobre segurança
3. O Vercel automaticamente começará a fazer deploy (você pode ver no dashboard do Vercel)

---

## 📍 PASSO 5: Verificar o Deploy no Vercel

### O que vamos fazer?
Confirmar que o deploy foi feito com sucesso e que tudo está funcionando.

### Passo a passo:

1. **Acesse o Vercel:**
   - Vá para: https://vercel.com/dashboard
   - Clique no seu projeto

2. **Verificar o deploy:**
   - Você deve ver um novo deploy na lista (o mais recente)
   - Deve mostrar status: **"Building"** → **"Ready"** (pode levar 1-2 minutos)

3. **Verificar logs (se houver erro):**
   - Clique no deploy mais recente
   - Clique em **"Functions"** ou **"Logs"**
   - Procure por erros (se aparecer "JWT_SECRET not set", significa que o Passo 3 não foi feito corretamente)

### ✅ Deploy bem-sucedido:
- Status mostra "Ready" ✅
- Não há erros nos logs ✅
- O site está funcionando ✅

---

## 📍 PASSO 6: Testar a Segurança

### O que vamos fazer?
Testar se tudo está funcionando corretamente.

### Teste 1: Login do Owner

1. Acesse: `https://seu-site.vercel.app/login.html`
2. Preencha:
   - **Email:** `sandrosandri.bysousa@gmail.com`
   - **Senha:** (sua senha atual)
   - **Security Answer:** `10.09.2025`
3. Clique em "Login"
4. **✅ Deve fazer login com sucesso**

### Teste 2: Acesso Admin Protegido

1. **Sem estar logado**, tente acessar: `https://seu-site.vercel.app/admin.html`
2. **✅ Deve redirecionar para login ou mostrar erro de acesso negado**

### Teste 3: API Protegida

1. **Sem estar logado**, acesse no navegador: `https://seu-site.vercel.app/api/admin?endpoint=customers`
2. **✅ Deve retornar erro 401 ou 403** (não deve mostrar dados dos clientes)

---

## ❓ Dúvidas Comuns

### "Não consigo gerar o JWT_SECRET"
- Use a Opção B ou C do Passo 2 (geradores online)

### "Não encontro Environment Variables no Vercel"
- Certifique-se de estar na aba "Settings" do projeto
- Procure no menu lateral esquerdo

### "O deploy falhou"
- Verifique se o `JWT_SECRET` foi configurado corretamente
- Veja os logs no Vercel para identificar o erro

### "Não consigo fazer git push"
- Verifique se está logado no GitHub
- Pode precisar configurar credenciais: https://docs.github.com/en/get-started/getting-started-with-git/set-up-git

---

## 📞 Precisa de ajuda?

Se ficar preso em algum passo, me diga:
- Em qual passo você está?
- Qual é a mensagem de erro (se houver)?
- O que você vê na tela?

Vou te ajudar a resolver! 😊

---

## ✅ Checklist Final

Antes de considerar tudo pronto, verifique:

- [ ] JWT_SECRET foi gerado
- [ ] JWT_SECRET foi adicionado no Vercel (Production, Preview, Development)
- [ ] Git commit foi feito
- [ ] Git push foi feito com sucesso
- [ ] Deploy no Vercel está "Ready"
- [ ] Login do owner funciona
- [ ] Admin está protegido (não acessível sem login)
- [ ] API admin retorna erro sem autenticação

**Quando todos estiverem marcados, está tudo pronto! 🎉**

