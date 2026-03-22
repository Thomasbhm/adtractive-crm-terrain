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
}

interface TaskPayload {
  title: string
  company_id: number
  priority: string
  end_date: string
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
    try {
      const errorData = await res.json()
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      // keep default message
    }
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

export async function createTask(
  data: TaskPayload,
  apiKey: string
): Promise<AxonautTask> {
  return axonautFetch<AxonautTask>('/tasks', apiKey, {
    method: 'POST',
    body: data,
  })
}
