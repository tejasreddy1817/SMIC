import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "SMIC-pro-media";

export function buildS3Key(userId: string, filename: string): string {
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `media/${userId}/${ts}-${safe}`;
}

export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return awsGetSignedUrl(s3, command, { expiresIn });
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const stream = resp.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
