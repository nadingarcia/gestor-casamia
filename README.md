# Gestor Casa Mia

Gestor de pedidos (desktop/web) da Pizzaria Casa Mia. Derivado do gestor NexFood,
mas lê os pedidos do banco da Casa Mia pela API do painel (`painelPizaria`).

```
cardápio (pizzariaMarcos) ──grava──▶ MongoDB ◀──lê/atualiza── painelPizaria /api ◀── gestor-casamia
```

## Funcionalidades

- Kanban: `Novos pedidos` → `Em preparação` → `Em entrega` → `Finalizados`.
- Aceite automático opcional, som e notificação de novo pedido.
- Impressão térmica (Electron) com cupom da Casa Mia: tamanho, meio a meio, bordas,
  observação do pedido, horário agendado, desconto (%) e troco.
- Pix online pendente/recusado separado do Kanban, com botão **Confirmar pagamento Pix**
  para quando o webhook do Mercado Pago não confirmar sozinho.
- Agrupamento de entregas por distância.
- Toda mudança de status dispara o push para o celular do cliente (feito pelo painel).

## Como os dados são traduzidos

Tudo fica em `src/utils/casaMiaPedido.js` (banco → formato interno) e
`src/utils/casaMiaApi.js` (chamadas HTTP).

| Banco (Casa Mia)       | Gestor               |
|------------------------|----------------------|
| `Aguardando Pagamento` | Pix pendente (fora do Kanban) |
| `Enviado`              | Novos pedidos        |
| `Em andamento`         | Em preparação        |
| `Em entrega`           | Em entrega           |
| `Finalizado`           | Finalizados          |

- Retirada = endereço da própria pizzaria (Rua Francisco Rebelo, 332) ou cliente `RETIRA`.
- `descontoAplicado` é **percentual**; o valor em reais é `subtotal + taxa − valorTotal`.
- Coordenadas `'0'` são tratadas como ausentes.
- Número do pedido = últimos 3 caracteres do `_id` (o mesmo do cupom do painel).

## API usada (`https://casamia.nexfood.app/api`)

- `POST /login` — telefone + senha (mesmo login do painel).
- `GET /pedidos/hoje` — pedidos do dia.
- `GET /pedidos/:id` — um pedido.
- `PATCH /pedidos/:id` — envia **só** `{ status }`.
- `PUT /pedidos/confirmar-pagamento/:id` — confirma Pix manualmente.

Para apontar para outra API: `VITE_API_URL=http://localhost:3000/api npm run dev`.

### Cuidados

- **Não use** `GET /pedidos`, `/pedidos/novos` ou `/pedidos/periodo`: no painel elas
  aceitam sozinhas todo pedido `Enviado`.
- Com o painel web aberto ao mesmo tempo, ele aceita os pedidos antes do gestor. O
  gestor trata pedido que aparece já "Em preparação", com menos de 20 min e nunca
  impresso, como novo (toca, avisa e imprime).
- A API é de **produção** e hoje não exige token nas rotas de pedidos. Para testar
  localmente sem mexer em pedido real, aponte `VITE_API_URL` para uma API falsa ou
  desligue o aceite automático antes de entrar.

## Desenvolvimento

```bash
npm install
npm run dev          # web (Vite)
npm run electrondev  # Electron + Vite
npm run lint
npm run build
npm run electron:build:win
```

## Release

Igual ao gestor NexFood: tag `v*` dispara `.github/workflows/release.yml`, que publica
no repositório `nadingarcia/gestor-casamia` (precisa existir no GitHub e ter `GH_TOKEN`).
