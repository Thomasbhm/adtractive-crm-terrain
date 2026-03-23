import { ObjectId } from 'mongodb'

export interface Organization {
  _id?: ObjectId
  nom: string
  openai_api_key: string    // chiffré AES-256
  created_at: Date
}
