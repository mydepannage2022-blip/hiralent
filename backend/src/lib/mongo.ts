import { MongoClient } from "mongodb";

const uri = `${process.env.MONGO_URI!}/talenta`;
const client = new MongoClient(uri);

export const mongo = client.db(); // 👈 export the DB instance

// OR optionally export client if needed
export default mongo;
