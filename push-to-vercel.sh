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

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ORIGIN=$(git remote get-url origin 2>/dev/null || true)
# URL com token (PAT): https://github.com/owner/repo.git
PUSH_URL=""
case "$ORIGIN" in
  https://github.com/*)
    PATH_AFTER_HOST=$(echo "$ORIGIN" | sed 's|^https://github.com/||;s|\.git$||')
    PUSH_URL="https://x-access-token:${TOKEN}@github.com/${PATH_AFTER_HOST}.git"
    ;;
  git@github.com:*)
    PATH_AFTER_COLON=$(echo "$ORIGIN" | sed 's|^git@github.com:||;s|\.git$||')
    PUSH_URL="https://x-access-token:${TOKEN}@github.com/${PATH_AFTER_COLON}.git"
    ;;
esac
if [ -z "$PUSH_URL" ]; then
  PUSH_URL="https://x-access-token:${TOKEN}@github.com/PedroSousa008/sandro-sandri.git"
fi
git push "$PUSH_URL" "$BRANCH"
echo "Push feito ($BRANCH). A Vercel faz deploy quando o projeto está ligado ao GitHub."
