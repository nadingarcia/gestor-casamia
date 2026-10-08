import { useState, useCallback, useId, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, RESTAURANTE, STORAGE_KEYS } from '../config'
import { getToken } from '../utils/apiFetch'

const API_URL = `${API_BASE}/login`

// ============================================================================
// UTILITIES
// ============================================================================

const formatPhone = (value = '') => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

// O painel salva o telefone exatamente como foi digitado no cadastro, com a
// máscara dele: "(11) 98765-4321" (ou "(11) 3456-7890" para fixo). O login
// compara texto puro, então mandamos nesse formato e, se não achar, só dígitos.
const mascaraDoPainel = (digits) =>
  digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2')

const formatosDeTelefone = (value) => {
  const digits = value.replace(/\D/g, '')
  return [...new Set([mascaraDoPainel(digits), value.trim(), digits])]
}

async function tentarLogin(telefone, password) {
  let ultimaResposta = null
  for (const formato of formatosDeTelefone(telefone)) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: formato, password }),
    })
    const data = await response.json().catch(() => ({}))
    ultimaResposta = { response, data }
    // Achou o usuário (com senha certa ou errada): não adianta tentar outro formato
    if (response.status !== 401 || data.message !== 'Usuário não encontrado') break
  }
  return ultimaResposta
}

const storage = {
  set: (key, value, persistent = true) => {
    try {
      const store = persistent ? localStorage : sessionStorage
      store.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      return true
    } catch {
      console.warn('Storage não disponível')
      return false
    }
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Login() {
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [state, setState] = useState({ loading: false, success: false, error: '' })
  
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica se já existe um token salvo (Seja fixo ou temporário)
    // Se tiver token, manda para pedidos e não renderiza o form
    if (getToken()) {
      navigate('/pedidos', { replace: true })
    }
  }, [navigate])
  
  const phoneId = useId()
  const passwordId = useId()
  const errorId = useId()

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePhoneChange = useCallback((e) => {
    setTelefone(formatPhone(e.target.value))
    setState((prev) => (prev.error ? { ...prev, error: '' } : prev))
  }, [])

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value)
    setState((prev) => (prev.error ? { ...prev, error: '' } : prev))
  }, [])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const toggleRemember = useCallback(() => {
    setRemember(prev => !prev)
  }, [])

  const handleForgotPassword = useCallback(() => {
    const telefoneDigitado = telefone.replace(/\D/g, '')
    const mensagem = telefoneDigitado
      ? `Olá! Esqueci minha senha. Meu telefone cadastrado é ${telefoneDigitado}. Pode me ajudar com o gestor da Casa Mia?`
      : 'Olá! Esqueci minha senha do gestor da Casa Mia. Pode me ajudar?'

    const whatsappUrl = `https://wa.me/5511968337522?text=${encodeURIComponent(mensagem)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }, [telefone])

  // ============================================================================
  // SUBMIT
  // ============================================================================

  const handleSubmit = async (e) => {
    e.preventDefault()
    setState({ loading: false, success: false, error: '' })

    if (!telefone.trim()) {
      setState({ loading: false, success: false, error: 'Por favor, informe seu telefone.' })
      return
    }
    if (!password) {
      setState({ loading: false, success: false, error: 'Por favor, informe sua senha.' })
      return
    }

    setState({ loading: true, success: false, error: '' })

    try {
      const { response, data } = await tentarLogin(telefone, password)

      if (!response.ok) {
        const mensagens = {
          'Usuário não encontrado': 'Telefone não cadastrado no painel da pizzaria.',
          'Senha incorreta': 'Senha incorreta.',
        }
        throw new Error(
          response.status === 401
            ? mensagens[data.message] || 'Telefone ou senha incorretos.'
            : 'Erro ao conectar. Tente novamente.'
        )
      }

      if (!data.token) throw new Error('Resposta inesperada do servidor.')

      // O login do painel devolve só token e id; os dados da loja são fixos
      storage.set(STORAGE_KEYS.user, { _id: data._id, telefone: telefone.replace(/\D/g, '') }, remember)
      storage.set(STORAGE_KEYS.token, data.token, remember)
      localStorage.setItem('nomeRestaurante', RESTAURANTE.nome)
      localStorage.setItem('cnpjRestaurante', RESTAURANTE.cnpj)
      if (!localStorage.getItem('enderecoRestaurante')) {
        localStorage.setItem('enderecoRestaurante', RESTAURANTE.endereco)
      }

      setState({ loading: false, success: true, error: '' })
      setTimeout(() => navigate('/pedidos'), 500)

    } catch (err) {
      setState({ 
        loading: false, 
        success: false, 
        error: err.message || 'Erro de conexão. Verifique sua internet.' 
      })
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
      
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* ========================================================================
            SEÇÃO ESQUERDA - Branding
        ======================================================================== */}
        <aside className="hidden lg:flex flex-col justify-center p-12">

  {/* Logo */}
  <div className="flex items-center gap-4 mb-12">
    <div className="w-16 h-16 rounded-xl bg-[#7f22fe] flex items-center justify-center shadow-lg">
      <i className="fas fa-pizza-slice text-white text-2xl"></i>
    </div>
    <div>
      <h2 className="text-gray-900 text-3xl font-bold tracking-tight">Casa Mia</h2>
      <p className="text-gray-500 text-sm font-medium">Gestor de Pedidos</p>
    </div>
  </div>

  <h3 className="text-4xl text-gray-900 font-bold mb-4 leading-tight">
    Da sacola do cliente ao forno
  </h3>
  <p className="text-gray-600 text-lg mb-12 leading-relaxed">
    Os pedidos do cardápio da Casa Mia chegam aqui, imprimem sozinhos e seguem para a cozinha.
  </p>

  {/* Features reais */}
  <ul className="space-y-5" role="list">
    {[
      {
        icon: 'fa-columns',
        title: 'Kanban em tempo real',
        desc: 'Recebido → Preparo → Entrega → Entregue. Avance pedidos com um clique.',
        colors: 'bg-purple-50 border-purple-200 text-purple-600'
      },
      {
        icon: 'fa-print',
        title: 'Impressão automática',
        desc: 'Cupom térmico 80mm imprime sozinho ao aceitar o pedido.',
        colors: 'bg-emerald-50 border-emerald-200 text-emerald-600'
      },
      {
        icon: 'fa-bell',
        title: 'Cliente avisado no celular',
        desc: 'Cada mudança de status envia uma notificação para o app do cliente.',
        colors: 'bg-green-50 border-green-200 text-green-600'
      },
      {
        icon: 'fa-route',
        title: 'Rotas otimizadas',
        desc: 'Agrupa entregas próximas e gera rota no Google Maps com múltiplas paradas.',
        colors: 'bg-orange-50 border-orange-200 text-orange-600'
      },
    ].map((item, i) => {
      const [bgClass, borderClass, textClass] = item.colors.split(' ')
      return (
        <li key={i} className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${bgClass} border ${borderClass} flex items-center justify-center`}>
            <i className={`fas ${item.icon} ${textClass}`}></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{item.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
          </div>
        </li>
      )
    })}
  </ul>

</aside>

        {/* ========================================================================
            FORMULÁRIO PRINCIPAL
        ======================================================================== */}
        <main className="flex flex-col justify-center">
          
          <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-10 shadow-sm">
            
            {/* Logo Mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[#7f22fe] flex items-center justify-center shadow-lg">
                <i className="fas fa-pizza-slice text-white text-xl"></i>
              </div>
              <div>
                <h2 className="text-gray-900 text-2xl font-bold">Casa Mia</h2>
                <p className="text-gray-500 text-xs font-medium">Gestão de Pedidos</p>
              </div>
            </div>

            {/* Header */}
            <header className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-600">Entre com o mesmo telefone e senha do painel da pizzaria</p>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              
              {state.error ? (
                <div
                  id={errorId}
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-fadeIn"
                >
                  <i className="fas fa-exclamation-circle text-red-500 text-lg flex-shrink-0 mt-0.5"></i>
                  <span className="font-medium">{state.error}</span>
                </div>
              ) : null}

              {/* Mensagem de Sucesso */}
              {state.success && (
                <div 
                  role="status" 
                  aria-live="polite"
                  className="flex items-center gap-3 p-4 mb-6 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm animate-fadeIn"
                >
                  <i className="fas fa-check-circle text-emerald-500 text-lg"></i>
                  <span className="font-medium">Login aprovado! Redirecionando...</span>
                </div>
              )}

              <div className="space-y-5">
                
                {/* INPUT TELEFONE */}
                <div>
                  <label 
                    htmlFor={phoneId} 
                    className="block text-gray-700 text-sm font-semibold mb-2"
                  >
                    Telefone
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="fas fa-mobile-alt text-lg"></i>
                    </div>
                    <input
                      id={phoneId}
                      type="tel"
                      inputMode="numeric"
                      value={telefone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      autoFocus
                      aria-invalid={state.error ? 'true' : 'false'}
                      aria-describedby={state.error ? errorId : undefined}
                      autoComplete="tel"
                      required
                      className="w-full h-14 pl-12 pr-4 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 
                        focus:bg-white focus:border-[#7f22fe] focus:ring-4 focus:ring-purple-100 
                        outline-none transition-all text-base
                        hover:border-gray-300"
                    />
                  </div>
                </div>

                {/* INPUT SENHA */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label 
                      htmlFor={passwordId} 
                      className="text-gray-700 text-sm font-semibold"
                    >
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[#7f22fe] hover:text-[#6b1de0] text-xs font-medium hover:underline transition"
                    >
                      Esqueceu?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="fas fa-lock text-lg"></i>
                    </div>
                    <input
                      id={passwordId}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      aria-invalid={state.error ? 'true' : 'false'}
                      aria-describedby={state.error ? errorId : undefined}
                      autoComplete="current-password"
                      required
                      className="w-full h-14 pl-12 pr-14 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 
                        focus:bg-white focus:border-[#7f22fe] focus:ring-4 focus:ring-purple-100 
                        outline-none transition-all text-base
                        hover:border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-[#7f22fe]/50"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-base`}></i>
                    </button>
                  </div>
                </div>

                {/* Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={toggleRemember}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-[#7f22fe] focus:ring-2 focus:ring-[#7f22fe]/50 focus:ring-offset-2 cursor-pointer transition-all"
                    />
                    <span className="text-gray-700 group-hover:text-gray-900 transition text-sm font-medium">
                      Manter conectado
                    </span>
                  </label>
                </div>

                {/* BOTÃO SUBMIT */}
                <button
                  type="submit"
                  disabled={state.loading || state.success}
                  className="
                    w-full h-14 rounded-lg font-semibold text-base text-white 
                    bg-[#7f22fe] hover:bg-[#6b1de0]
                    shadow-sm hover:shadow-md
                    disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-[#7f22fe]
                    transition-all duration-200
                    focus:outline-none focus:ring-4 focus:ring-purple-200
                    flex items-center justify-center gap-2
                    active:scale-[0.98]
                  "
                >
                  {state.loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-lg"></i>
                      <span>Autenticando...</span>
                    </>
                  ) : state.success ? (
                    <>
                      <i className="fas fa-check-circle text-lg"></i>
                      <span>Login aprovado!</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Sistema</span>
                      <i className="fas fa-arrow-right"></i>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
          
          {/* Copyright */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-3 text-gray-400 text-xs bg-white border border-gray-200 px-4 py-3 rounded-lg">
              <i className="fas fa-shield-alt text-emerald-500"></i>
              <span>Pizzaria Casa Mia • Desenvolvido por Nadin Garcia</span>
            </div>
          </div>
        </main>

      </div>

      {/* Animações */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Custom checkbox styling */
        input[type="checkbox"]:checked {
          background-color: #7f22fe;
          border-color: #7f22fe;
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
        }
      `}</style>
    </div>
  )
}
