import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI non définie dans les variables d\'environnement')
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db('crm-terrain')

  cachedClient = client
  cachedDb = db

  return { client, db }
}
