# Tonder SDK

Tonder SDK Lite to integrate REST service

## Installation

You can install using NPM
```bash
npm i @tonder.io/ionic-lite-sdk
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

// To verify a 3ds transaction you can use the following method
// It should be called after the injectCheckout method
// The response status will be one of the following
// ['Declined', 'Cancelled', 'Failed', 'Success', 'Pending', 'Authorized']

inlineCheckout.verify3dsTransaction().then(response => {
  console.log('Verify 3ds response', response)
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

# Checkout router

```typescript

const returnUrl = "http://localhost:8100/payment/success";

let checkoutData = {
  customer: {
    name: "Jhon",
    lastname: "Doe",
    email: "john.c.calhoun@examplepetstore.com",
    phone: "+58452258525"
  },
  order: {
    items: [
      {
        description: "Test product description",
        quantity: 1,
        price_unit: 25,
        discount: 1,
        taxes: 12,
        product_reference: 89456123,
        name: "Test product",
        amount_total: 25
      }
    ]
  },
  return_url: returnUrl,
  total: 25,
  isSandbox: true,
  metadata: {},
  currency: "MXN",
  skyflowTokens: {
    cardholder_name: "",
    card_number: "",
    expiration_year: "",
    expiration_month: "",
    cvv: "",
    skyflow_id: ""
  }
}

```

<font size="4">It is required get the skyflow tokens to add it to the checkout router method, the values of the variable skyflowFields come from your html form</font>

```typescript

const merchantData: any = await liteCheckout.getBusiness();

const { vault_id, vault_url } = merchantData;

const skyflowFields = {
  card_number: this.paymentForm.value.cardNumber,
  cvv: this.paymentForm.value.cvv,
  expiration_month: this.paymentForm.value.month,
  expiration_year: this.paymentForm.value.expirationYear,
  cardholder_name: this.paymentForm.value.name
}

const skyflowTokens = await liteCheckout.getSkyflowTokens({
  vault_id: vault_id,
  vault_url: vault_url,
  data: skyflowFields
})

checkoutData.skyflowTokens = skyflowTokens;

const jsonResponseRouter: any = await liteCheckout.startCheckoutRouterFull(
  checkoutData
);

```

<font size="4">Take actions on base to the checkout router response</font>

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
