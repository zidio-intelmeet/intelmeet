import type { AuthUser } from '../context/auth'

export type StoredCredential = AuthUser & {
  password: string
}

const CREDENTIALS_KEY = 'intellmeet-credentials'

function readCredentials() {
  try {
    const storedCredentials = localStorage.getItem(CREDENTIALS_KEY)
    return storedCredentials ? (JSON.parse(storedCredentials) as StoredCredential[]) : []
  } catch {
    localStorage.removeItem(CREDENTIALS_KEY)
    return []
  }
}

function writeCredentials(credentials: StoredCredential[]) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function findCredential(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return readCredentials().find((credential) => credential.email.toLowerCase() === normalizedEmail) ?? null
}

export function saveCredential(credential: StoredCredential) {
  const normalizedCredential = {
    ...credential,
    email: credential.email.trim().toLowerCase(),
  }
  const credentials = readCredentials().filter(
    (currentCredential) => currentCredential.email.toLowerCase() !== normalizedCredential.email,
  )

  writeCredentials([...credentials, normalizedCredential])
}
