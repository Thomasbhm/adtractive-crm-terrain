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
  must_change_password: boolean
  axonaut_api_key: string        // chiffré AES-256, vide par défaut
  axonaut_api_key_set: boolean   // false par défaut
  created_at: Date
}
