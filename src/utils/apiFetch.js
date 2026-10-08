import { STORAGE_KEYS } from '../config'

// O painel da Casa Mia emite um JWT sem refresh token. Se a API responder 401
// a sessão acabou: limpa e volta para o login.

export const getToken = () =>
  localStorage.getItem(STORAGE_KEYS.token) || sessionStorage.getItem(STORAGE_KEYS.token)

export function clearSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

function redirectToLogin() {
  clearSession()
  window.location.href = '/#/login'
}

export async function apiFetch(url, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    redirectToLogin()
    return new Response(JSON.stringify({ message: 'Sessão expirada.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return response
}
