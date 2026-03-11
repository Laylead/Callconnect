const PAYSTACK_SECRET = "sk_test_5c3e54a3d6b337aee6c5ff8a274ff7236bdc8403";
const PAYSTACK_BASE = "https://api.paystack.co";

async function fetchTransactions(afterTimestamp){

const res = await fetch(
`${PAYSTACK_BASE}/transaction?perPage=50`,
{
headers:{
Authorization:`Bearer ${PAYSTACK_SECRET}`
}
}
);

const data = await res.json();

if(!data.status) throw new Error("Paystack fetch failed");

if(!afterTimestamp) return data.data;

return data.data.filter(t => t.paid_at && new Date(t.paid_at).getTime() > afterTimestamp);

}

async function verifyTransaction(reference){

const res = await fetch(
`${PAYSTACK_BASE}/transaction/verify/${reference}`,
{
headers:{
Authorization:`Bearer ${PAYSTACK_SECRET}`
}
}
);

const data = await res.json();

if(!data.status) throw new Error("Verification failed");

return data.data;

}
