# Gestor Casa Mia (gestor-casamia)

App Electron + React (Vite, Tailwind) que o caixa da Pizzaria Casa Mia usa para
acompanhar os pedidos do cardápio. Nasceu de uma cópia do gestor do NexFood
(`../gestor-pedidos`) adaptada ao banco da Casa Mia. Conversa com a usuária em
**português do Brasil**.

## Sistemas envolvidos

| Projeto | O que é | Onde roda |
|---|---|---|
| `../pizzariaMarcos` | Cardápio (PWA) onde o cliente compra | Vercel (`pizzaria-marcos.vercel.app`) |
| `../painelPizaria` | Painel administrativo + **API que o gestor usa** | VPS: `https://casamia.nexfood.app` (também segue na Vercel, só para o login do Mercado Pago) |
| este repo | Gestor desktop (Windows) | Releases em `github.com/nadingarcia/gestor-casamia` |

Os três usam o **mesmo MongoDB Atlas** (cluster da Casa Mia). O cardápio grava os
pedidos; painel e gestor leem e mudam status.

## Como o gestor fala com a API

- `src/config.js`: `API_BASE` = `https://casamia.nexfood.app/api` (ou `VITE_API_URL`).
- `src/utils/casaMiaApi.js`: só usa `GET /pedidos/hoje`, `GET /pedidos/:id`,
  `PATCH /pedidos/:id` (status), `PUT /pedidos/confirmar-pagamento/:id` e
  `POST /pedidos/checar-status-batch` **sempre com `forceGatewayCheck: true`**.
  - **Nunca** usar `GET /pedidos`, `/pedidos/novos`, `/pedidos/periodo` nem o
    `checar-status-batch` sem `forceGatewayCheck`: no painel eles **aceitam
    sozinhos** todo pedido "Enviado".
- `src/utils/casaMiaPedido.js`: traduz o pedido do banco para o formato interno
  (herdado do NexFood). Status: Enviado→Recebido, Em andamento→Em preparação,
  Em entrega→Saiu para entrega, Finalizado→Entregue. Número do pedido = últimos
  3 caracteres do `_id`.
- Login: `POST /login` com telefone (o painel guarda com máscara `(11) 98765-4321`).
- Busca pedidos a cada 10 s (`ORDER_REFRESH_SECONDS`).

## Decisões já tomadas (não refazer)

- **Sem tela de cozinha e sem etiquetas de sacola** — foram removidas de propósito
  (rota `/kitchen`, `KitchenDisplay.jsx`, IPC no Electron, modal de sacolas).
- **Pedidos agendados** (`horarioEntrega`): regra em `src/utils/agendamento.js`.
  O cardápio só deixa agendar para hoje, a partir de 1 h depois do pedido. O preparo
  começa `ANTECEDENCIA_PREPARO_MIN` (60, igual ao painel) antes do horário.
  Antes disso o card mostra só o badge 📅 HH:MM (sem contagem, nunca "atrasado");
  na janela de preparo toca som + push e aparece o alerta "agendado para preparar".
  Coluna "Em preparo" ordena pelo início do preparo. Clustering usa o mesmo tempo.
  Cupom: bloco preto no topo "ENTREGA/RETIRADA AGENDADA HH:MM — Preparar às HH:MM".
- **Pix online** (`status` "Aguardando Pagamento", `tipoPagamento: 'online'`):
  fica fora do Kanban; menu "Pix Pendente" no topo (`PixPendingMenu`) lista todos.
  No modal: Verificar pagamento no Mercado Pago / Confirmar manualmente (2º clique) /
  Cancelar pedido (2º clique). A cada 60 s o gestor consulta o MP para os pendentes
  com menos de 90 min. Quando um Pix aprovado chega em "Em preparação" é tratado
  como pedido novo (som + impressão). Se some da lista (cancelado/excluído no
  painel), avisa e fecha o modal aberto. Recusado (`statusPagamento` rejeitado)
  continua em "Aguardando Pagamento" e aparece em vermelho.
- Aceite automático com Pix aprovado pelo gestor: pedido vai direto para "Em
  preparação" (igual ao painel).

## Release

- Workflow `.github/workflows/release.yml`: push de tag `v*` → build Windows no
  GitHub Actions com `GITHUB_TOKEN` → etapa final `gh release edit --draft=false`
  (sem ela a release ficava rascunho).
- Para lançar: subir `"version"` no `package.json`, commit, `git tag vX.Y.Z`,
  `git push origin main vX.Y.Z`. O auto-update (`electron-updater`) lê o `latest.yml`
  da release; o repo **precisa ser público**.
- v1.0.0 publicada em 08/10/2026. O `.exe` não é assinado (SmartScreen avisa).
- O painel (`../painelPizaria`, menu "Gestor (App)") busca a última release
  em `api.github.com/repos/nadingarcia/gestor-casamia/releases/latest` para mostrar
  versão e link do `.exe`.

## Verificar mudanças

- `npx eslint src electron` e `npm run build` precisam passar.
- `npx vite` (porta 5173) roda no navegador contra a API de produção — cuidado:
  aceitar/avançar/cancelar mexe em pedidos reais. Testar com pedidos de teste da
  usuária.
