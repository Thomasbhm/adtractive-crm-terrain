import { ObjectId } from 'mongodb'

export interface Task {
  _id: ObjectId
  description: string
  due_date: Date
  type: 'rappel' | 'email' | 'reunion' | 'devis' | 'autre'
  done: boolean
  axonaut_task_id: string   // vide en v0.1
}

export interface Contact {
  _id?: ObjectId
  org_id: ObjectId
  scanned_by: ObjectId
  scanned_by_name: string
  prenom: string
  nom: string
  societe: string
  poste: string
  email: string
  telephone: string
  telephone_2: string
  adresse: string
  site_web: string
  linkedin: string
  note: string
  source: 'scan_carte' | 'manuel'
  card_image_url: string
  axonaut_company_id: string    // vide en v0.1
  axonaut_employee_id: string   // vide en v0.1
  axonaut_synced: boolean       // false en v0.1
  tasks: Task[]
  scanned_at: Date
  updated_at: Date
}
