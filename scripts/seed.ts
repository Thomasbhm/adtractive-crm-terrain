import { MongoClient, ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:xH5h3phbYh48uSmogWfLnDzO8Id5GGck@76.13.63.126:32768/?authSource=admin'

async function seed() {
  console.log('Connexion à MongoDB...')
  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db('crm-terrain')

  console.log('Suppression des données existantes...')
  await db.collection('organizations').deleteMany({})
  await db.collection('users').deleteMany({})

  // Create organization
  const orgId = new ObjectId()
  await db.collection('organizations').insertOne({
    _id: orgId,
    nom: 'ADtractive Media',
    axonaut_api_key: '',
    openai_api_key: '',
    created_at: new Date(),
  })
  console.log('Organisation créée: ADtractive Media')

  // Create admin
  const adminPassword = await bcrypt.hash('Admin2024!', 12)
  await db.collection('users').insertOne({
    _id: new ObjectId(),
    org_id: orgId,
    email: 'admin@adtractive.fr',
    password: adminPassword,
    role: 'admin',
    nom: 'Admin',
    prenom: 'ADtractive',
    is_active: true,
    created_at: new Date(),
  })
  console.log('Admin créé: admin@adtractive.fr / Admin2024!')

  // Create commercial
  const commercialPassword = await bcrypt.hash('Commercial2024!', 12)
  await db.collection('users').insertOne({
    _id: new ObjectId(),
    org_id: orgId,
    email: 'commercial@adtractive.fr',
    password: commercialPassword,
    role: 'commercial',
    nom: 'Dupont',
    prenom: 'Jean',
    is_active: true,
    created_at: new Date(),
  })
  console.log('Commercial créé: commercial@adtractive.fr / Commercial2024!')

  // Create indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('contacts').createIndex({ org_id: 1, scanned_by: 1 })
  await db.collection('contacts').createIndex({ org_id: 1, scanned_at: -1 })
  console.log('Index créés')

  await client.close()
  console.log('\nSeed terminé avec succès !')
  console.log('\nComptes de test:')
  console.log('  Admin:      admin@adtractive.fr / Admin2024!')
  console.log('  Commercial: commercial@adtractive.fr / Commercial2024!')
}

seed().catch((err) => {
  console.error('Erreur seed:', err)
  process.exit(1)
})
