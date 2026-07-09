<script setup>
import { computed, ref, watch } from 'vue'
import { login, register } from '../../services/authService'
import AuthModeSwitch from './AuthModeSwitch.vue'
import FormMessage from '../common/FormMessage.vue'

const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true,
  },
  initialErrorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['authenticated'])

const email = ref('')
const password = ref('')
const mode = ref('login')
const isSubmitting = ref(false)
const errorMessage = ref(props.initialErrorMessage)

const isRegisterMode = computed(() => mode.value === 'register')
const title = computed(() => (isRegisterMode.value ? 'Konto erstellen' : 'Anmelden'))
const submitLabel = computed(() => (isRegisterMode.value ? 'Registrieren' : 'Einloggen'))
const canSubmit = computed(() => email.value.trim() && password.value)

watch(
  () => props.initialErrorMessage,
  (message) => {
    errorMessage.value = message
  },
)

async function submitAuth() {
  if (!canSubmit.value) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const credentials = {
      email: email.value.trim(),
      password: password.value,
    }
    const session = isRegisterMode.value
      ? await register(credentials)
      : await login(credentials)

    password.value = ''
    emit('authenticated', session)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

function switchMode(nextMode) {
  mode.value = nextMode
  errorMessage.value = ''
  password.value = ''
}
</script>

<template>
  <section class="panel auth-panel" aria-labelledby="auth-heading">
    <AuthModeSwitch :mode="mode" @change="switchMode" />

    <h2 id="auth-heading">{{ title }}</h2>

    <form class="auth-form" @submit.prevent="submitAuth">
      <label for="email">E-Mail</label>
      <input
        id="email"
        v-model="email"
        autocomplete="email"
        inputmode="email"
        maxlength="320"
        type="email"
        required
      />

      <label for="password">Passwort</label>
      <input
        id="password"
        v-model="password"
        :autocomplete="isRegisterMode ? 'new-password' : 'current-password'"
        minlength="12"
        type="password"
        required
      />

      <p v-if="isRegisterMode" class="hint">
        Mindestens 12 Zeichen mit Grossbuchstaben, Kleinbuchstaben, Zahl und
        Sonderzeichen.
      </p>

      <FormMessage v-if="errorMessage" type="error" :message="errorMessage" />
      <FormMessage v-else-if="isLoading" message="Session wird geladen ..." />

      <button type="submit" :disabled="isSubmitting || isLoading || !canSubmit">
        {{ submitLabel }}
      </button>
    </form>
  </section>
</template>
