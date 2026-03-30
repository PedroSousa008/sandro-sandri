#!/bin/sh
# Push to GitHub → Vercel faz deploy automático
# Usa token do GitHub (uma vez só). Ver instruções no fim do script.

set -e
cd "$(dirname "$0")"

# Ler token: variável GITHUB_TOKEN ou ficheiro .github-token
if [ -n "$GITHUB_TOKEN" ]; then
  TOKEN="$GITHUB_TOKEN"
elif [ -f .github-token ]; then
  TOKEN=$(cat .github-token | tr -d '\n\r ')
else
  echo ""
  echo "  ERRO: Não há token do GitHub."
  echo ""
  echo "  1. Abre: https://github.com/settings/tokens/new"
  echo "  2. Nome: ex. 'Vercel push' | Expira: 90 dias | Marca: repo"
  echo "  3. Gera o token e copia."
  echo "  4. Nesta pasta do projeto, cria um ficheiro .github-token e cola lá o token (só a linha do token)."
  echo "     Ou no Terminal:  echo 'COLA_AQUI_O_TOKEN' > .github-token"
  echo "  5. Volta a correr:  ./push-to-vercel.sh"
  echo ""
  exit 1
fi

git push "https://PedroSousa008:${TOKEN}@github.com/PedroSousa008/sandro-sandri.git" main
echo "Push feito. A Vercel vai fazer deploy em breve."
