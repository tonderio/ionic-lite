export type Customer = {
    firstName: string
    lastName: string
    country: string
    street: string
    city: string
    state: string
    postCode: string
    email: string
    phone: string
}

export type Business = { 
    vault_id: string, 
    vault_url: string, 
    openpay_keys: {
        merchant_id: string, 
        public_key: string
    }, 
    reference: string, 
    business: {
        pk: string
    } 
}