const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient('mongodb+srv://db:db@cluster0.dp9r0re.mongodb.net/?appName=Cluster0'); 
  await client.connect(); 
  const db = client.db('test'); 
  await db.collection('meetings').updateMany({}, { $set: { summary: '', actionItems: [] } }); 
  console.log('Cleared DB summaries and tasks'); 
  await client.close(); 
} 
run().catch(console.error);
