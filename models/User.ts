import { ObjectId } from 'mongodb'

export interface User {
  _id?: ObjectId
  org_id: ObjectId
  email: string
  password: string           // bcrypt hash
  role: 'admin' | 'commercial'
  nom: string
  prenom: string
  is_active: boolean
  created_at: Date
}
