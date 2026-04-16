import { ObjectId } from 'mongodb'
import { connectToDatabase } from './mongodb'
import { decrypt } from './crypto'

const BASE_URL = 'https://axonaut.com/api/v2'

interface AxonautCompany {
  id: number
  name: string
  is_prospect: boolean
  is_customer: boolean
  comments: string
}

interface AxonautEmployee {
  id: number
  firstname: string
  lastname: string
  email: string
  company_id: number
}

interface AxonautEvent {
  id: number
}

interface AxonautTask {
  id: number
}

interface CompanyPayload {
  name: string
  is_prospect: boolean
  comments: string
}

interface EmployeePayload {
  company_id: number
  firstname: string
  lastname: string
  email: string
  phone_number: string
  cellphone_number: string
}

interface NotePayload {
  company_id: number
  nature: number
  date: string
  content: string
  is_done: boolean
  title?: string
  duration?: number
}

export interface EventPayload {
  company_id: number
  nature: number
  date: string
  content: string
  is_done: boolean
  title?: string
  duration?: number
  employee_email?: string
}

interface TaskPayload {
  title: string
  company_id: number
  priority: string
  end_date: string
}

// Récupère la clé API Axonaut de l'utilisateur connecté (déchiffrée)
export async function getUserAxonautKey(userId: string): Promise<string> {
  const { db } = await connectToDatabase()
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })

  if (!user?.axonaut_api_key) {
    throw new Error('Clé API Axonaut non configurée. Configurez-la dans votre profil.')
  }

  return decrypt(user.axonaut_api_key)
}

// Génère une date RFC3339 compatible Axonaut (sans millisecondes, avec offset timezone)
export function toAxonautRFC3339(date: Date = new Date()): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const minutes = String(absOffset % 60).padStart(2, '0')

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hours}:${minutes}`
}

async function axonautFetch<T>(
  endpoint: string,
  apiKey: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options

  const headers: Record<string, string> = {
    userApiKey: apiKey,
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let errorMessage = `Axonaut API error ${res.status}`
    let rawBody: unknown = null
    try {
      rawBody = await res.json()
    } catch {
      try {
        rawBody = await res.text()
      } catch {
        // ignore
      }
    }

    const extract = (v: unknown): string | null => {
      if (!v) return null
      if (typeof v === 'string') return v
      if (typeof v === 'object') {
        const obj = v as Record<string, unknown>
        if (typeof obj.message === 'string') return obj.message
        if (typeof obj.error === 'string') return obj.error
        if (typeof obj.detail === 'string') return obj.detail
        try {
          return JSON.stringify(v)
        } catch {
          return null
        }
      }
      return String(v)
    }

    const extracted = extract(rawBody)
    if (extracted) errorMessage = `${errorMessage} — ${extracted}`

    // Log pour debug côté serveur
    console.error(`[Axonaut] ${method} ${endpoint} → ${res.status}`, rawBody)

    throw new Error(errorMessage)
  }

  return res.json()
}

export async function searchCompany(
  name: string,
  apiKey: string
): Promise<AxonautCompany[]> {
  const encoded = encodeURIComponent(name)
  const results = await axonautFetch<AxonautCompany[]>(
    `/companies?search=${encoded}`,
    apiKey
  )
  return results.slice(0, 3)
}

export async function createCompany(
  data: CompanyPayload,
  apiKey: string
): Promise<AxonautCompany> {
  return axonautFetch<AxonautCompany>('/companies', apiKey, {
    method: 'POST',
    body: data,
  })
}

export async function createEmployee(
  data: EmployeePayload,
  apiKey: string
): Promise<AxonautEmployee> {
  return axonautFetch<AxonautEmployee>('/employees', apiKey, {
    method: 'POST',
    body: data,
  })
}

export async function deleteEmployee(
  employeeId: number,
  apiKey: string
): Promise<void> {
  await axonautFetch<unknown>(`/employees/${employeeId}`, apiKey, {
    method: 'DELETE',
  })
}

export async function updateEmployee(
  employeeId: number,
  data: { comments: string },
  apiKey: string
): Promise<AxonautEmployee> {
  return axonautFetch<AxonautEmployee>(`/employees/${employeeId}`, apiKey, {
    method: 'PATCH',
    body: data,
  })
}

export async function createNote(
  data: NotePayload,
  apiKey: string
): Promise<AxonautEvent> {
  return axonautFetch<AxonautEvent>('/events', apiKey, {
    method: 'POST',
    body: data,
  })
}

export async function createEvent(
  data: EventPayload,
  apiKey: string
): Promise<AxonautEvent> {
  return axonautFetch<AxonautEvent>('/events', apiKey, {
    method: 'POST',
    body: data,
  })
}

export async function createTask(
  data: TaskPayload,
  apiKey: string
): Promise<AxonautTask> {
  return axonautFetch<AxonautTask>('/tasks', apiKey, {
    method: 'POST',
    body: data,
  })
}

export async function searchEmployees(
  query: string,
  apiKey: string
): Promise<AxonautEmployee[]> {
  const encoded = encodeURIComponent(query)
  const results = await axonautFetch<AxonautEmployee[]>(
    `/employees?search=${encoded}`,
    apiKey
  )
  return results.slice(0, 5)
}

// ---------------------------------------------------------------------------
// Détail entreprise — helpers pour la fiche Axonaut interne
// ---------------------------------------------------------------------------

export async function getCompany(
  companyId: number,
  apiKey: string
): Promise<any> {
  return axonautFetch<any>(`/companies/${companyId}`, apiKey)
}

export async function getEmployee(
  employeeId: number,
  apiKey: string
): Promise<any> {
  return axonautFetch<any>(`/employees/${employeeId}`, apiKey)
}

export async function getCompanyEmployees(
  companyId: number,
  apiKey: string
): Promise<any[]> {
  return axonautFetch<any[]>(`/companies/${companyId}/employees`, apiKey)
}

export async function getCompanyEvents(
  companyId: number,
  apiKey: string
): Promise<any[]> {
  return axonautFetch<any[]>(`/companies/${companyId}/events`, apiKey)
}

export async function getCompanyQuotations(
  companyId: number,
  apiKey: string
): Promise<any[]> {
  return axonautFetch<any[]>(`/companies/${companyId}/quotations`, apiKey)
}

export async function getCompanyInvoices(
  companyId: number,
  apiKey: string
): Promise<any[]> {
  return axonautFetch<any[]>(`/companies/${companyId}/invoices`, apiKey)
}

export async function getCompanyOpportunities(
  companyId: number,
  apiKey: string
): Promise<any[]> {
  return axonautFetch<any[]>(`/companies/${companyId}/opportunities`, apiKey)
}

export async function getCompanyContracts(
  companyId: number,
  apiKey: string
): Promise<any[]> {
  return axonautFetch<any[]>(`/companies/${companyId}/contracts`, apiKey)
}

// Sync uniquement les mises à jour (note/tâches) pour un contact déjà synchronisé
export async function syncUpdatesToAxonaut(
  companyId: number,
  apiKey: string,
  updates: {
    newNote?: string
    newTasks?: Array<{ description: string; due_date?: string | Date }>
  }
): Promise<void> {
  // Ajouter la note si présente
  if (updates.newNote) {
    await createNote(
      {
        company_id: companyId,
        nature: 6,
        date: toAxonautRFC3339(new Date()),
        content: updates.newNote,
        is_done: true,
      },
      apiKey
    )
  }

  // Ajouter les tâches si présentes
  if (updates.newTasks?.length) {
    for (const task of updates.newTasks) {
      const dueDate = task.due_date ? new Date(task.due_date) : new Date()
      const d = dueDate.getDate().toString().padStart(2, '0')
      const m = (dueDate.getMonth() + 1).toString().padStart(2, '0')
      const y = dueDate.getFullYear()

      await createTask(
        {
          title: task.description,
          company_id: companyId,
          priority: 'normale',
          end_date: `${d}/${m}/${y}`,
        },
        apiKey
      )
    }
  }
}
