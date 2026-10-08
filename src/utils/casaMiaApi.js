// Chamadas à API do painel da Casa Mia. Devolvem sempre pedidos já no
// formato interno (ver casaMiaPedido.js).
//
// Atenção: GET /pedidos, /pedidos/novos e /pedidos/periodo do painel aceitam
// sozinhos todo pedido "Enviado". O gestor usa só /pedidos/hoje e
// /pedidos/:id, que não alteram nada, e /checar-status-batch sempre com
// forceGatewayCheck (sem ele o painel também aceita os "Enviado").

import { API_BASE } from '../config'
import { apiFetch } from './apiFetch'
import { normalizarPedido, statusParaBanco } from './casaMiaPedido'

async function mensagemDeErro(res, padrao) {
  try {
    const data = await res.json()
    return data?.message || data?.error || padrao
  } catch {
    return padrao
  }
}

async function exigirOk(res, padrao) {
  if (!res.ok) throw new Error(await mensagemDeErro(res, `${padrao} (${res.status})`))
  return res
}

export async function listarPedidosDoDia({ signal } = {}) {
  const res = await apiFetch(`${API_BASE}/pedidos/hoje`, { signal })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizarPedido) : []
}

export async function buscarPedido(id) {
  const res = await exigirOk(
    await apiFetch(`${API_BASE}/pedidos/${id}`),
    'Não foi possível conferir o pedido.'
  )
  return normalizarPedido(await res.json())
}

// PATCH /pedidos/:id usa .save() no painel, que dispara o push de mudança de
// status para o celular do cliente. Mandamos só o status, nada mais.
export async function atualizarStatus(id, statusInterno) {
  await exigirOk(
    await apiFetch(`${API_BASE}/pedidos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: statusParaBanco(statusInterno) }),
    }),
    'Falha ao atualizar status do pedido'
  )
}

// Pix online que o cliente pagou mas o webhook não confirmou: marca como
// aprovado e manda para produção.
export async function confirmarPagamento(id) {
  await exigirOk(
    await apiFetch(`${API_BASE}/pedidos/confirmar-pagamento/${id}`, { method: 'PUT' }),
    'Falha ao confirmar pagamento'
  )
}

// Pergunta ao Mercado Pago como está o Pix (o mesmo "Verificar Pagamento" do
// painel). Com forceGatewayCheck o painel só mexe nos pedidos informados:
// aprovado vai para preparo, recusado/cancelado vira "Cancelado".
// Devolve o pedido como ficou, ou null se ele não voltou na resposta.
export async function verificarPagamentoPix(id) {
  const res = await exigirOk(
    await apiFetch(`${API_BASE}/pedidos/checar-status-batch`, {
      method: 'POST',
      body: JSON.stringify({ orderIds: [id], forceGatewayCheck: true }),
    }),
    'Não foi possível verificar o pagamento.'
  )
  const data = await res.json()
  const pedido = (data?.pedidos || []).find((p) => String(p._id) === String(id))
  return pedido ? normalizarPedido(pedido) : null
}

// Pix que não vai ser pago: cancela como o painel faz.
export async function cancelarPedido(id) {
  await atualizarStatus(id, 'Cancelado')
}
