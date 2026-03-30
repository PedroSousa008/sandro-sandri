# Fluxo: quando uma pessoa finaliza a compra

## Para o utilizador (cliente)

1. **No Stripe** – Preenche dados de envio e cartão e clica em **Pagar**.
2. **Redirecionamento** – O Stripe envia-o para **order-success.html** com `?session_id=...`.
3. **Página de confirmação** – Vê "Thank you for your order", mensagem de e-mail de confirmação e botão "Continue Shopping".
4. **Histórico** – A encomenda fica guardada no perfil do utilizador (por e-mail) para sincronização entre dispositivos.

---

## Para ti (Owner) – o que o website faz atrás das cortinas

Quando o pagamento é confirmado, o **Stripe envia um evento** para o teu servidor (webhook). O ficheiro **api/webhooks/stripe.js** trata desse evento e:

### 1. Inventário (stocks)
- Chama **decrementInventoryOnPaidOrder**: reduz o stock por capítulo (Chapter I / II) e por tamanho (XS, S, M, L, XL) para cada item comprado.
- Usa o sistema de inventário por capítulo em **lib/storage.js**.

### 2. Encomendas (tabela de orders)
- **saveOrder**: guarda a encomenda com:
  - número (SS-YYYYMMDD-XXXXX), session_id Stripe, status PAID
  - e-mail, nome, telefone, morada de envio
  - carrinho (itens, preços, quantidades)
  - totais (subtotal, portes, total), capítulos comprados, tamanhos comprados
  - confirmação (Nothing → Packed → Sent → Delivered) e campo para número de rastreio
- As encomendas ficam em **storage** (Vercel KV em produção).

### 3. Histórico do utilizador
- A encomenda é também adicionada a **userData[email].orders** para o cliente ver o histórico na conta e em outros dispositivos.

### 4. Onde vês tudo (Owner Mode)
- **Admin** → **Orders Management** → "Load All Orders": lista todas as encomendas (vindas de **getOrders()**).
- **Admin** → inventário / stocks: refletem as vendas após cada pagamento (por capítulo e tamanho).

---

## Configuração obrigatória: Webhook Stripe

Para as tabelas e stocks se atualizarem sozinhos, o Stripe tem de conseguir chamar o teu servidor:

1. **Stripe Dashboard** → Developers → Webhooks → **Add endpoint**.
2. **URL:** `https://<o-teu-dominio-vercel>.vercel.app/api/webhooks/stripe`
3. **Eventos:** marca pelo menos **checkout.session.completed**.
4. **Signing secret** – Copia o valor (começa por `whsec_...`).
5. **Vercel** → projeto → Settings → Environment Variables:
   - Nome: **STRIPE_WEBHOOK_SECRET**
   - Valor: o `whsec_...` que copiaste
   - Ambientes: Production (e Preview se quiseres testar)
6. **Redeploy** do projeto na Vercel após guardar a variável.

Sem **STRIPE_WEBHOOK_SECRET** e sem o endpoint configurado no Stripe, o webhook não é chamado e **não há atualização de encomendas nem de stocks** quando alguém paga.

---

## Resumo

| Quem        | O que acontece |
|------------|-----------------|
| **Cliente** | Redirecionado para order-success; vê confirmação e histórico na conta. |
| **Website** | Webhook recebe `checkout.session.completed` → atualiza stocks (decrement) e grava encomenda (saveOrder + user orders). |
| **Tu (Owner)** | Vês encomendas em Admin → Orders Management e stocks atualizados no inventário por capítulo. |
