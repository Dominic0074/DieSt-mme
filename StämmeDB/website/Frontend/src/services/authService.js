import { getJson, postEmpty, postJson } from './apiClient'

/**
 * @typedef {import('../types/auth').AuthCredentials} AuthCredentials
 * @typedef {import('../types/auth').AuthSession} AuthSession
 */

/**
 * @returns {Promise<AuthSession>}
 */
export function getSession() {
  return getJson('/api/auth/me')
}

/**
 * @param {AuthCredentials} credentials
 * @returns {Promise<AuthSession>}
 */
export function login(credentials) {
  return postJson('/api/auth/login', credentials)
}

/**
 * @param {AuthCredentials} credentials
 * @returns {Promise<AuthSession>}
 */
export function register(credentials) {
  return postJson('/api/auth/register', credentials)
}

export function logout() {
  return postEmpty('/api/auth/logout')
}
