import { ObjectId } from 'mongodb'

export interface Organization {
  _id?: ObjectId
  nom: string
  axonaut_api_key: string   // chiffré AES-256, vide en v0.1
  openai_api_key: string    // chiffré AES-256
  created_at: Date
}
