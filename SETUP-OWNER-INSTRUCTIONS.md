# 🔧 Como Definir a Senha do Owner

## Método 1: Via Console do Navegador (Mais Rápido)

1. **Acesse qualquer página do seu site** (ex: `https://seu-site.vercel.app/login.html`)

2. **Abra o Console do Navegador:**
   - Pressione `F12` ou `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Vá na aba **"Console"**

3. **Execute este comando:**
   ```javascript
   fetch('/api/admin/setup-owner', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       password: 'YOUR_CHOSEN_PASSWORD'
     })
   })
   .then(r => r.json())
   .then(data => {
     console.log('Resultado:', data);
     if (data.success) {
       alert('✅ Senha definida com sucesso! Agora pode fazer login.');
     } else {
       alert('❌ Erro: ' + (data.error || 'Falha ao definir senha'));
     }
   })
   .catch(error => {
     console.error('Erro:', error);
     alert('❌ Erro ao conectar: ' + error.message);
   });
   ```

4. **Aguarde a resposta:**
   - Se aparecer "✅ Senha definida com sucesso!", está pronto!
   - Se aparecer erro, me diga qual é a mensagem

5. **Tente fazer login** com o email definido em `OWNER_EMAIL` e a senha que configurou. A resposta da pergunta de segurança deve ser a definida em `OWNER_SECURITY_ANSWER` (variáveis de ambiente na Vercel).

---

## Método 2: Via Página de Setup (Após Deploy)

1. Aguarde 2-3 minutos para o deploy terminar
2. Acesse: `https://seu-site.vercel.app/setup-owner.html`
3. Preencha o formulário e defina a senha

---

## Se Nada Funcionar

Me diga qual erro aparece no console e eu ajudo a resolver!

