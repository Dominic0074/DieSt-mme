<script setup>
defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['login', 'register'].includes(value),
  },
})

const emit = defineEmits(['change'])
</script>

<template>
  <div class="mode-switch" role="tablist" aria-label="Auth Modus">
    <button
      type="button"
      :class="{ active: mode === 'login' }"
      @click="emit('change', 'login')"
    >
      Login
    </button>
    <button
      type="button"
      :class="{ active: mode === 'register' }"
      @click="emit('change', 'register')"
    >
      Registrieren
    </button>
  </div>
</template>
