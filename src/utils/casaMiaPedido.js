// Tradução entre o pedido como está no banco da Casa Mia e o formato que o
// gestor usa internamente (herdado do gestor NexFood). Todo o resto do app
// enxerga só o formato interno — se o banco mudar, só este arquivo muda.

import { TIPO_PEDIDO_BALCAO, TIPO_PEDIDO_DELIVERY } from './orderType'

// Status do banco → status das colunas do Kanban
const STATUS_INTERNO = {
  'Aguardando Pagamento': 'Aguardando pagamento',
  Enviado: 'Recebido',
  'Em andamento': 'Em preparação',
  'Em entrega': 'Saiu para entrega',
  Finalizado: 'Entregue',
  Cancelado: 'Cancelado',
}

const STATUS_BANCO = Object.fromEntries(
  Object.entries(STATUS_INTERNO).map(([banco, interno]) => [interno, banco])
)

export const statusParaBanco = (statusInterno) =>
  STATUS_BANCO[statusInterno] || statusInterno

// Formas de pagamento do cardápio/painel → chaves que o gestor já sabe exibir.
// 'pix' no cardápio é sempre Pix online (Mercado Pago); Pix na entrega é 'pix-entrega'.
const FORMA_PAGAMENTO = {
  pix: 'pix_online',
  'pix-entrega': 'pix_presencial',
  cartao: 'cartao',
  credito: 'credito',
  debito: 'debito',
  vr: 'refeicao_maq',
  dinheiro: 'dinheiro',
  entrega: 'na_entrega',
}

// Retirada no balcão: o cardápio grava o endereço da própria pizzaria, e o
// painel usa o cliente "RETIRA" para pedidos de balcão lançados à mão.
const ehRetirada = (pedido) => {
  const end = pedido.endereco || {}
  const enderecoDaLoja =
    /francisco rebelo/i.test(end.rua || '') && String(end.numero || '').trim() === '332'
  const clienteRetira = String(pedido.cliente?.nome || '').trim().toUpperCase() === 'RETIRA'
  return enderecoDaLoja || clienteRetira
}

// O banco guarda coordenadas como texto e usa '0' quando não tem — o
// agrupamento por distância precisa de número ou nada.
const coordenada = (valor) => {
  const n = parseFloat(valor)
  return Number.isFinite(n) && n !== 0 ? n : undefined
}

const capitalizar = (texto = '') => texto.charAt(0).toUpperCase() + texto.slice(1)

const normalizarItem = (item, index) => {
  const tamanho = item.tamanho ? capitalizar(String(item.tamanho)) : ''
  const nomeBase = String(item.name || 'Item').trim()
  return {
    _id: `${item.id || 'item'}-${index}`,
    nome: tamanho ? `${nomeBase} (${tamanho})` : nomeBase,
    nomeBase,
    tamanho,
    meioAMeio: /^meia .+\/\s*meia /i.test(nomeBase),
    quantidade: Number(item.quantity) || 1,
    precoUnitario: Number(item.price) || 0,
    complementos: Array.isArray(item.adicionais) ? item.adicionais.filter(Boolean) : [],
    obs: item.obs || item.observacao || '',
  }
}

const arredondar = (valor) => Math.round(valor * 100) / 100

export function normalizarPedido(pedido) {
  if (!pedido || typeof pedido !== 'object') return pedido

  const itens = (pedido.itens || []).map(normalizarItem)
  const subtotal = arredondar(
    itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0)
  )
  const taxaEntrega = Number(pedido.taxaEntrega) || 0
  const total = Number(pedido.valorTotal) || 0

  // descontoAplicado é percentual. O valor em reais é o que sobra entre a
  // soma dos itens e o total cobrado — só quando houve desconto de fato, pois
  // o cardápio arredonda centavos para baixo mesmo sem desconto.
  const descontoPercentual = Number(pedido.descontoAplicado) || 0
  const desconto =
    descontoPercentual > 0 ? Math.max(0, arredondar(subtotal + taxaEntrega - total)) : 0

  const retirada = ehRetirada(pedido)
  const end = pedido.endereco || {}
  const troco = parseFloat(String(pedido.troco ?? '').replace(',', '.'))
  const clienteBruto = pedido.cliente && typeof pedido.cliente === 'object' ? pedido.cliente : null
  const statusPagamento = pedido.statusPagamento || 'pendente'
  const pagamentoOnline = pedido.tipoPagamento === 'online'

  return {
    _id: pedido._id,
    // Mesmo número curto que o painel imprime no cupom (#abc)
    numeroPedido: String(pedido._id || '').slice(-3).toUpperCase(),
    status: STATUS_INTERNO[pedido.status] || pedido.status,
    statusBanco: pedido.status,
    tipo: retirada ? TIPO_PEDIDO_BALCAO : TIPO_PEDIDO_DELIVERY,
    createdAt: pedido.dataPedido,
    horarioEntrega: pedido.horarioEntrega || null,
    cliente: clienteBruto
      ? {
          _id: clienteBruto._id,
          nome: retirada && clienteBruto.nome?.trim().toUpperCase() === 'RETIRA'
            ? 'Balcão'
            : clienteBruto.nome,
          telefone: clienteBruto.telefone,
          totalPedidos: Array.isArray(clienteBruto.compras) ? clienteBruto.compras.length : 0,
        }
      : null,
    enderecoEntrega: retirada
      ? null
      : {
          rua: end.rua || '',
          numero: end.numero || '',
          complemento: end.complemento || '',
          bairro: end.bairro || '',
          cidade: end.cidade || '',
          estado: end.estado || '',
          latitude: coordenada(end.latitud),
          longitude: coordenada(end.longitud),
        },
    itens,
    subtotal,
    taxaEntrega,
    desconto,
    descontoPercentual,
    origemDesconto: desconto > 0 ? 'DESCONTO_PERCENTUAL' : '',
    total,
    formaPagamento: FORMA_PAGAMENTO[pedido.formaPagamento] || pedido.formaPagamento || '',
    statusPagamento,
    pagamentoOnline,
    pagamentoId: pedido.pagamentoId || null,
    aguardandoPagamento: pedido.status === 'Aguardando Pagamento',
    pagamentoRecusado:
      pagamentoOnline && ['rejeitado', 'cancelado'].includes(statusPagamento),
    trocoPara: Number.isFinite(troco) && troco > 0 ? troco : null,
    observacao: pedido.observacao || '',
  }
}
