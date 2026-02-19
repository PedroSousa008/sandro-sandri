# Deploy automático: GitHub + Vercel

## Objetivo
Cada alteração no código deve ser enviada para o GitHub e deployada no Vercel sem erros.

## O que está configurado

1. **Commit automático**  
   Sempre que forem feitas alterações no projeto, estas são commitadas com uma mensagem clara.

2. **Push automático (hook Git)**  
   Foi criado o hook `.git/hooks/post-commit`: após cada `git commit`, é executado `git push origin main`.  
   **Ativar o hook (uma vez):**
   ```bash
   chmod +x .git/hooks/post-commit
   ```
   No Terminal (Cursor ou macOS), na pasta do projeto, executa o comando acima.

3. **Vercel**  
   Com o repositório ligado no Vercel, cada push para a branch `main` dispara um deploy automático.

## Fluxo

- **Alterações no código** → commit (automático quando trabalhas com o assistente)  
- **Após o commit** → push para `main` (automático se o hook estiver ativo)  
- **Push no GitHub** → deploy no Vercel (automático)

## Se o push pedir credenciais

- **HTTPS:** Cria um Personal Access Token no GitHub e usa-o como password quando o Git pedir.
- **SSH:** Configura uma chave SSH e usa `git remote set-url origin git@github.com:PedroSousa008/sandro-sandri.git`.

Depois disso, o hook faz o push sem pedir nada em cada commit.

## Verificar

- Após um commit, no Terminal: `git log -1` e depois verifica no GitHub que o commit aparece.
- No Vercel, em Deployments, deve surgir um novo deploy após cada push.
