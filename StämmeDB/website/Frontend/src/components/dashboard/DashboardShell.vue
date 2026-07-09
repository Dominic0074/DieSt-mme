<script setup>
import FormMessage from '../common/FormMessage.vue'

defineProps({
  session: {
    type: Object,
    required: true,
  },
  isSubmitting: {
    type: Boolean,
    required: true,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['logout'])
</script>

<template>
  <section class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">StaemmeDB</p>
        <h1>Dashboard</h1>
      </div>
      <button
        class="secondary"
        type="button"
        :disabled="isSubmitting"
        @click="emit('logout')"
      >
        Abmelden
      </button>
    </header>

    <FormMessage v-if="errorMessage" type="error" :message="errorMessage" />

    <section class="panel">
      <p class="eyebrow">Angemeldet</p>
      <h2>{{ session.user?.email }}</h2>
      <p class="muted">
        Deine App-Identitaet ist getrennt von Spielern und Doerfern aus der
        Die-Staemme-Datenbank.
      </p>
    </section>
  </section>
</template>
