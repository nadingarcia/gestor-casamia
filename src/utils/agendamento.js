// Pedidos agendados: no cardápio o cliente escolhe a hora da entrega (só
// horários de hoje, a partir de 1h depois do pedido) e ela chega em
// horarioEntrega. O painel só manda começar o preparo 1h antes desse horário;
// o gestor segue a mesma regra para não marcar agendado como atrasado.

import { isDelivery } from './orderType'

export const ANTECEDENCIA_PREPARO_MIN = 60

const MINUTO_MS = 60 * 1000

export const isAgendado = (pedido) => !!pedido?.horarioEntrega

// Momento em que o pedido começa a contar tempo: a criação para pedidos
// normais, o início do preparo para agendados.
export const getInicioContagem = (pedido) =>
  isAgendado(pedido)
    ? new Date(new Date(pedido.horarioEntrega).getTime() - ANTECEDENCIA_PREPARO_MIN * MINUTO_MS)
    : pedido?.createdAt

// Minutos entre o início da contagem e o prazo de entrega/retirada
export const getPrazoMinutos = (pedido) =>
  isAgendado(pedido) ? ANTECEDENCIA_PREPARO_MIN : isDelivery(pedido) ? 40 : 15

// Agendado cujo horário de preparo ainda não chegou
export const isAguardandoHorario = (pedido, now = Date.now()) =>
  isAgendado(pedido) && now < new Date(getInicioContagem(pedido)).getTime()
