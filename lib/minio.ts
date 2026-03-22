import * as Minio from 'minio'

export const minioClient = new Minio.Client({
  endPoint: 'minio.authomations.com',
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})

const BUCKET = process.env.MINIO_BUCKET || 'crm-terrain'

const publicReadPolicy = JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${BUCKET}/*`],
    },
  ],
})

let policyApplied = false

export async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BUCKET)
  }

  // Appliquer la policy publique en lecture (une fois par démarrage)
  if (!policyApplied) {
    try {
      await minioClient.setBucketPolicy(BUCKET, publicReadPolicy)
      policyApplied = true
    } catch (err) {
      console.error('Failed to set bucket policy:', err)
    }
  }
}

export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  await ensureBucketExists()

  await minioClient.putObject(BUCKET, fileName, buffer, buffer.length, {
    'Content-Type': contentType,
  })

  return `https://minio.authomations.com/${BUCKET}/${fileName}`
}

export { BUCKET }
