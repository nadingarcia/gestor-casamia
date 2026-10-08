import React from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../utils/apiFetch'

export default function ProtectedRoute({ children }) {
  if (typeof window === 'undefined') return null

  // Sem token, volta para o login. Token vencido é tratado pelo apiFetch (401).
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}
