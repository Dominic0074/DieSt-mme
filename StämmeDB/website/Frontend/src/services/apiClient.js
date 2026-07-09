export async function getJson(url) {
  const response = await fetch(url)
  return parseJsonResponse(response)
}

export async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return parseJsonResponse(response)
}

export async function postEmpty(url) {
  const response = await fetch(url, {
    method: 'POST',
  })

  if (response.status === 204 || response.status === 401) {
    return null
  }

  return parseJsonResponse(response)
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    throw new Error(await readProblem(response))
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function readProblem(response) {
  try {
    const data = await response.json()
    if (data?.errors) {
      return Object.values(data.errors).flat().join(' ')
    }

    return data?.message || data?.title || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}
