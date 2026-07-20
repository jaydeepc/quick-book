import { MongoClient, Db } from "mongodb";
import type { EventDoc, LinkDoc, ResponseDoc } from "./types";

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _qbMongoPromise: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (process.env.NODE_ENV === "development") {
    // Reuse the connection across HMR reloads in dev.
    if (!global._qbMongoPromise) {
      global._qbMongoPromise = new MongoClient(uri).connect();
    }
    return global._qbMongoPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db("quickblock");
}

export async function collections() {
  const db = await getDb();
  return {
    events: db.collection<EventDoc>("events"),
    links: db.collection<LinkDoc>("links"),
    responses: db.collection<ResponseDoc>("responses"),
  };
}
