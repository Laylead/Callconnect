// TESTING ONLY

const PAYSTACK_SECRET_KEY = "sk_test_5c3e54a3d6b337aee6c5ff8a274ff7236bdc8403"

const PAYSTACK_URL = "https://api.paystack.co"

let lastSeenTransaction = null

window.paystack = {

async getTransactions(){

const res = await fetch(PAYSTACK_URL + "/transaction",{
headers:{
Authorization:"Bearer "+PAYSTACK_SECRET_KEY
}
})

const data = await res.json()

return data.data || []

},

async verify(reference){

const res = await fetch(PAYSTACK_URL + "/transaction/verify/"+reference,{
headers:{
Authorization:"Bearer "+PAYSTACK_SECRET_KEY
}
})

return await res.json()

}

}
