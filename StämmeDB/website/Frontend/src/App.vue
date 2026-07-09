<script setup>
import { onMounted, ref } from 'vue'
import AuthPage from './components/auth/AuthPage.vue'
import DashboardShell from './components/dashboard/DashboardShell.vue'
import { getSession, logout as logoutUser } from './services/authService'

const session = ref({ isAuthenticated: false, user: null })
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function loadSession() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    session.value = await getSession()
  } catch (error) {
    errorMessage.value = `Session konnte nicht geladen werden: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

function handleAuthenticated(nextSession) {
  session.value = nextSession
  errorMessage.value = ''
}

async function handleLogout() {
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await logoutUser()
    session.value = { isAuthenticated: false, user: null }
  } catch (error) {
    errorMessage.value = `Logout fehlgeschlagen: ${error.message}`
  } finally {
    isSubmitting.value = false
  }
}

onMounted(loadSession)
</script>

<template>
  <main class="page">
    <DashboardShell
      v-if="session.isAuthenticated"
      :session="session"
      :is-submitting="isSubmitting"
      :error-message="errorMessage"
      @logout="handleLogout"
    />

    <AuthPage
      v-else
      :is-loading="isLoading"
      :initial-error-message="errorMessage"
      @authenticated="handleAuthenticated"
    />
  </main>
</template>
