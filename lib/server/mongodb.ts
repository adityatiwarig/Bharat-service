import 'server-only';

import { GridFSBucket, MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'govcrm';

declare global {
  // eslint-disable-next-line no-var
  var __govcrmMongoClientPromise__: Promise<MongoClient> | undefined;
}

export function isMongoConfigured() {
  return Boolean(uri);
}

export async function getDatabase(): Promise<Db> {
  if (!uri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  const clientPromise =
    global.__govcrmMongoClientPromise__ ??
    new MongoClient(uri, {
      maxPoolSize: 10,
    }).connect();

  global.__govcrmMongoClientPromise__ = clientPromise;

  const client = await clientPromise;
  return client.db(databaseName);
}

export async function getGridFSBucket(bucketName = 'complaintUploads') {
  const db = await getDatabase();
  return new GridFSBucket(db, { bucketName });
}
