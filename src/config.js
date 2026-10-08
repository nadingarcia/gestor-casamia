// Configuração central do Gestor Casa Mia.
// A API é a do painel administrativo (painelPizaria), que lê o mesmo MongoDB
// onde o cardápio (pizzariaMarcos) grava os pedidos. O painel roda na VPS
// (PM2 + Nginx atrás da Cloudflare); a cópia na Vercel segue no ar só para o
// login do Mercado Pago.

export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://casamia.nexfood.app/api'

// Prefixo das chaves de localStorage/sessionStorage — separado do gestor
// NexFood para os dois poderem rodar na mesma máquina sem misturar sessão.
export const STORAGE_PREFIX = 'casamia_'

export const STORAGE_KEYS = {
  token: `${STORAGE_PREFIX}token`,
  user: `${STORAGE_PREFIX}user`,
}

// Dados fixos da loja (os mesmos do cupom impresso pelo painel)
export const RESTAURANTE = {
  nome: 'Pizzaria Casa Mia',
  endereco: 'Rua Francisco Rebelo, 332 - Vila California, São Paulo - SP',
  cnpj: '63171139000118',
}
