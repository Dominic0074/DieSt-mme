<script setup>
import { onMounted, ref } from 'vue'

const items = ref([])
const newItemName = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function loadItems() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch('/api/items')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    items.value = await response.json()
  } catch (error) {
    errorMessage.value = `Einträge konnten nicht geladen werden: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

async function createItem() {
  const name = newItemName.value.trim()
  if (!name) {
    return
  }

  errorMessage.value = ''

  try {
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const item = await response.json()
    items.value.unshift(item)
    newItemName.value = ''
  } catch (error) {
    errorMessage.value = `Eintrag konnte nicht angelegt werden: ${error.message}`
  }
}

async function deleteItem(id) {
  errorMessage.value = ''

  try {
    const response = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    items.value = items.value.filter((item) => item.id !== id)
  } catch (error) {
    errorMessage.value = `Eintrag konnte nicht gelöscht werden: ${error.message}`
  }
}

onMounted(loadItems)
</script>

<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">ASP.NET Core + Vue</p>
      <h1>website</h1>
      <p class="intro">
        Das Frontend wird gemeinsam mit der API gebaut und direkt von ASP.NET
        Core ausgeliefert.
      </p>
    </section>

    <section class="panel" aria-labelledby="items-heading">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Beispiel-Workflow</p>
          <h2 id="items-heading">Einträge</h2>
        </div>
        <button class="secondary" type="button" @click="loadItems">
          Aktualisieren
        </button>
      </div>

      <form class="create-form" @submit.prevent="createItem">
        <label for="item-name">Neuer Eintrag</label>
        <div class="input-row">
          <input
            id="item-name"
            v-model="newItemName"
            maxlength="200"
            placeholder="Name eingeben"
          />
          <button type="submit" :disabled="!newItemName.trim()">
            Hinzufügen
          </button>
        </div>
      </form>

      <p v-if="errorMessage" class="message error" role="alert">
        {{ errorMessage }}
      </p>
      <p v-else-if="isLoading" class="message">Einträge werden geladen …</p>
      <p v-else-if="items.length === 0" class="message">
        Noch keine Einträge vorhanden.
      </p>

      <ul v-else class="item-list">
        <li v-for="item in items" :key="item.id">
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ new Date(item.createdAt).toLocaleString('de-DE') }}</span>
          </div>
          <button
            class="danger"
            type="button"
            :aria-label="`${item.name} löschen`"
            @click="deleteItem(item.id)"
          >
            Löschen
          </button>
        </li>
      </ul>
    </section>
  </main>
</template>
