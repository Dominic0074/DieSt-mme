<script setup>
defineProps({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'error'].includes(value),
  },
})
</script>

<template>
  <p class="message" :class="{ error: type === 'error' }" :role="type === 'error' ? 'alert' : null">
    {{ message }}
  </p>
</template>
