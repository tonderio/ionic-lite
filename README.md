# Tonder SDK

Tonder SDK Lite to integrate REST service

## Installation

You can install using NPM
```bash
npm i @tonder.io/ionic-lite-sdk
```

or using an script tag
```html
// TO DO
```

Add dependencies to the root of the app (index.html)
```html
<script src=https://openpay.s3.amazonaws.com/openpay.v1.min.js></script>
<script src=https://openpay.s3.amazonaws.com/openpay-data.v1.min.js></script>
```

## Usage
## Import LiteCheckout class
```javascript
import { LiteCheckout } from "@tonder.io/ionic-lite-sdk"
```
## Create instance

```javascript
const liteCheckout = new LiteCheckout({ 
  signal, 
  baseUrlTonder, 
  apiKeyTonder
})
```

| Property        | Type          | Description                                                             |
|:---------------:|:-------------:|:-----------------------------------------------------------------------:|
| signal          | AborSignal    | Signal from AbortController instance if it need cancel request          |
| baseUrlTonder   | string        | Live server: http://stage.tonder.io                                     |
|                 |               | Mock Server: https://stoplight.io/mocks/tonder/tonder-api-v1-2/3152148  |
| apiKeyTonder    | string        | You can take this from you Tonder Dashboard                             |
|                 |               |                                                                         |

# Class methods

# Business

## Get business

```javascript
const merchantData = await liteCheckout.getBusiness();
```

## Return business data

```typescript
{
    business: {
        pk: number,
        name: string,
        categories: [
          {
            pk: number,
            name: string
          }
        ],
        web: string,
        logo: string,
        full_logo_url: string,
        background_color: string,
        primary_color: string,
        checkout_mode: boolean,
        textCheckoutColor: string,
        textDetailsColor: string,
        checkout_logo: string
    },
    openpay_keys: {
        merchant_id: string,
        public_key: string
    },
    fintoc_keys: {
        public_key: string
    },
    vault_id: string,
    vault_url: string,
    reference: number,
    is_installments_available: boolean
}
```

# OpenPay

## Get OpenPay session id

```javascript
const { openpay_keys } = merchantData;

const deviceSessionIdTonder = await liteCheckout.getOpenpayDeviceSessionID(
  openpay_keys.merchant_id,
  openpay_keys.public_key,
  is_sandbox: true
);
```

## Return OpenPay device session id

string

# Customer

## Get customer authorization token

```javascript
const customerEmail = "john.c.calhoun@examplepetstore.com";

const { auth_token } = await liteCheckout.customerRegister(customerEmail);
```

## Return customer data

```typescript
{
    id: number,
    email: string,
    auth_token: string
}
```

# Order

## Create order

```typescript
const cartItems = [
  {
    description: "Test product description",
    quantity: 1,
    price_unit: 25,
    discount: 0,
    taxes: 12,
    product_reference: 65421,
    name: "Test product",
    amount_total: 25
  }
]

const { reference } = merchantData;

const orderData = {
  business: apiKeyTonder,
  client: auth_token,
  billing_address_id: null,
  shipping_address_id: null,
  amount: total,
  status: "A",
  reference: reference,
  is_oneclick: true,
  items: cartItems,
};

const jsonResponseOrder = await liteCheckout.createOrder(
  orderData
);
```

## Return order data
```typescript
{
    id: number,
    created: string,
    amount: string,
    status: string,
    payment_method?: string,
    reference?: string,
    is_oneclick: boolean,
    items: [
        {
            description: string,
            product_reference: string,
            quantity: string,
            price_unit: string,
            discount: string,
            taxes: string,
            amount_total: string
        }
    ],
    billing_address?: string,
    shipping_address?: string,
    client: {
        email: string,
        name: string,
        first_name: string,
        last_name: string,
        client_profile: {
            gender: string,
            date_birth?: string,
            terms: boolean,
            phone: string
        }
    }
}
```

# Payment

## Create payment
```javascript
const now = new Date();
const dateString = now.toISOString();

const { id: customerId } = await liteCheckout.customerRegister(customerEmail);

const paymentData = {
  business_pk: business.pk,
  amount: total,
  date: dateString,
  order_id: jsonResponseOrder.id,
  client_id: customerId,
};

const jsonResponsePayment = await liteCheckout.createPayment(
  paymentData
);
```

## Return payment data
```javascript
{
  pk: number,
  order?: string,
  amount: string,
  status: string,
  date: string,
  paid_date?: string,
  shipping_address: {
    street: string,
    number: string,
    suburb: string,
    city: {
      name: string
    },
    state: {
      name: string,
      country: {
          name: string
      }
    },
    zip_code: string
  },
  shipping_address_id?: string,
  billing_address: {
    street: string,
    number: string,
    suburb: string,
    city: {
      name: string
    },
    state: {
      name: string,
      country: {
        name: string
      }
    },
    zip_code: string
  },
  billing_address_id?: string,
  client?: string,
  customer_order_reference?: string
}
```

# Skyflow tokens

## Get skyflow payment form tokenized values

The values of the variable skyflowTokens come from your html form

```javascript

const skyflowFields = {
  card_number: this.paymentForm.value.cardNumber,
  cvv: this.paymentForm.value.cvv,
  expiration_month: this.paymentForm.value.month,
  expiration_year: this.paymentForm.value.expirationYear,
  cardholder_name: this.paymentForm.value.name
}

const { vault_id, vault_url } = merchantData;


const skyflowTokens = await liteCheckout.getSkyflowTokens({
  vault_id: vault_id,
  vault_url: vault_url,
  data: skyflowFields
})

```

## Return skyflow tokenized data
```typescript
{
    vaultID: string,
    responses: [
        {
            records: [
                {
                    skyflow_id: string
                }
            ]
        },
        {
            fields: {
                card_number: string,
                cardholder_name: string,
                cvv: string,
                expiration_month: string,
                expiration_year: string,
                skyflow_id: string
            }
        }
    ]
}
```

# Checkout router

## Get checkout router data

```javascript

const customerPhone = "+11111111";
const returnUrl = "http://localhost:8100/payment/success";

const routerData = {
  card: skyflowTokens,
  name: skyflowTokens.cardholder_name,
  last_name: "",
  email_client: customerEmail,
  phone_number: customerPhone,
  return_url: returnUrl,
  id_product: "no_id",
  quantity_product: 1,
  id_ship: "0",
  instance_id_ship: "0",
  amount: total,
  title_ship: "shipping",
  description: "Transaction from the lite SDK",
  device_session_id: deviceSessionIdTonder,
  token_id: "",
  order_id: jsonResponseOrder.id,
  business_id: business.pk,
  payment_id: jsonResponsePayment.pk,
  source: 'ionic-lite-sdk',
  metadata: {
    name: "xxxxx"
  },
  currency: "MXN"
};

const jsonResponseRouter = await liteCheckout.startCheckoutRouter(
  routerData
);

```

## Return checkout router data

```typescript
{
    status: 200,
    message: "Success",
    psp_response: {
        id: string,
        authorization: number,
        operation_type: string,
        transaction_type: string,
        status: string,
        conciliated: boolean,
        creation_date: string,
        operation_date: string,
        description: string,
        error_message?: string,
        order_id?: string,
        card: {
            type: string,
            brand: string,
            address?: string,
            card_number: string,
            holder_name: string,
            expiration_year: string,
            expiration_month: string,
            allows_charges: boolean,
            allows_payouts: boolean,
            bank_name: string,
            points_type: string,
            points_card: boolean,
            bank_code: number
        },
        customer_id: string,
        gateway_card_present: string,
        amount: number,
        fee: {
            amount: number,
            tax: number,
            currency: string
        },
        payment_method: {
            type: string,
            url: string
        },
        currency: string,
        method: string,
        object: string
    },
    transaction_status: string,
    transaction_id: number,
    payment_id: number,
    provider: string,
    next_action: {
        redirect_to_url: {
            url: string,
            return_url: string,
            verify_transaction_status_url: string
        }
    },
    actions: [
        {
            name: string,
            url: string,
            method: string
        }
    ]
}
```

## Take actions on base to the checkout router response

# Customer Cards(Register)

## Register customer card

```typescript

customer_auth_token: string;

data: {
    skyflow_id: string;
};

const jsonResponseOrder = await liteCheckout.registerCustomerCard(
  customer_auth_token,
  data
);
```

## Return register customer card
```typescript
{
    skyflow_id: string;
    user_id: number;
}
```

# Customer Cards(Get)

## Get customer cards

```typescript

customer_auth_token: string;

query: string = "?ordering=<string>&search=<string>";

const jsonResponseOrder = await liteCheckout.getCustomerCards(
  customer_auth_token,
  query
);
```

## Return get customer cards
```typescript
{
    user_id: number,
    cards: [
        {
            fields: {
                card_number: string,
                cardholder_name: string,
                cvv: string,
                expiration_month: string,
                expiration_year: string,
                skyflow_id: string
            }
        }
    ]
}
```

## Delete customer card

```typescript

const deleted: boolean = await liteCheckout.deleteCustomerCard(
  customer_auth_token,
  skyflow_id
);

```

## License

[MIT](https://choosealicense.com/licenses/mit/)
