import { request } from './api'

// A sessão fica num cookie HttpOnly: o navegador envia sozinho, o JavaScript não lê.

/** { googleClientId } — null quando o "Entrar com o Google" não está configurado. */
export async function getAuthConfig() {
  return request('/auth/config')
}

/** { user } — user é null quando ninguém entrou neste navegador. */
export async function getCurrentUser() {
  return request('/auth/me')
}

/** Cria a conta e já entra. Corpo: { name, email, password, confirmPassword } */
export async function registerAccount(data) {
  return request('/auth/register', { method: 'POST', body: data })
}

export async function loginWithPassword({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } })
}

/** `credential` é o ID token devolvido pelo botão do Google. */
export async function loginWithGoogle(credential) {
  return request('/auth/google', { method: 'POST', body: { credential } })
}

export async function logoutAccount() {
  return request('/auth/logout', { method: 'POST' })
}
