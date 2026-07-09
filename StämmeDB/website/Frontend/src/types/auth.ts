export type AuthMode = 'login' | 'register'

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  isAuthenticated: boolean
  user: AuthUser | null
}
