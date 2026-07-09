<script setup>
import AuthForm from './AuthForm.vue'
import AuthIntro from './AuthIntro.vue'

defineProps({
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
</script>

<template>
  <section class="auth-layout">
    <AuthIntro />
    <AuthForm
      :is-loading="isLoading"
      :initial-error-message="initialErrorMessage"
      @authenticated="emit('authenticated', $event)"
    />
  </section>
</template>
