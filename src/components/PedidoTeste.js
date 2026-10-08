// ── Pedido fictício para imprimir teste de estilo ─────────────────────────
export const PEDIDO_TESTE_IMPRESSAO = {
  _id: 'test00000000',
  numeroPedido: 'TESTE',
  createdAt: new Date().toISOString(),
  tipo: 'Delivery',
  status: 'Em preparação',
  cliente: { nome: 'Cliente Teste', telefone: '11999999999', totalPedidos: 3 },
  enderecoEntrega: {
    rua: 'Rua Exemplo', numero: '100',
    bairro: 'Vila California', cidade: 'São Paulo', complemento: 'Casa 2',
  },
  itens: [
    { nome: 'Meia Calabresa / Meia Mussarela (Grande)', quantidade: 1, precoUnitario: 65.99,
      complementos: ['Borda Catupiry'], obs: '' },
    { nome: 'Portuguesa (Broto)', quantidade: 1, precoUnitario: 45.99, complementos: [], obs: '' },
    { nome: 'Guaraná 2L', quantidade: 1, precoUnitario: 14.00, complementos: [], obs: '' },
  ],
  subtotal: 125.98, taxaEntrega: 6.00, desconto: 13.19, descontoPercentual: 10, total: 118.79,
  origemDesconto: 'DESCONTO_PERCENTUAL',
  observacao: 'Tocar o interfone 2x',
  formaPagamento: 'dinheiro', statusPagamento: 'pendente', trocoPara: 150,
}
