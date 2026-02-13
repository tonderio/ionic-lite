# Tonder SDK

Tonder SDK helps to integrate the services Tonder offers in your own mobile app


## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Configuration Options](#configuration-options)
4. [Card On File](#card-on-file)
5. [Mobile Settings](#mobile-settings)
6. [Payment Data Structure](#payment-data-structure)
7. [Field Validation Functions](#field-validation-functions)
8. [API Reference](#api-reference)
9. [Error Handling](#error-handling)
10. [Examples](#examples)
11. [Deprecated Fields](#deprecated-fields)
12. [Deprecated Functions](#deprecated-functions)
13. [License](#license)


## Installation

You can install using NPM
```bash
npm i @tonder.io/ionic-lite-sdk
```

Add dependencies to the root of the app (index.html) only if you are going to use Openpay as the payment processor.
```html
<script src=https://openpay.s3.amazonaws.com/openpay.v1.min.js></script>
<script src=https://openpay.s3.amazonaws.com/openpay-data.v1.min.js></script>
```

## Usage
LiteCheckout allows you to build a custom checkout interface using Tonder's core functionality
### Import LiteCheckout class
```javascript
import { LiteCheckout } from "@tonder.io/ionic-lite-sdk"
```
### Create instance

```javascript
const liteCheckout = new LiteCheckout({ 
  signal, 
  baseUrlTonder, 
  apiKeyTonder
})

// The configureCheckout function allows you to set initial information,
// such as the customer's email, which is used to retrieve a list of saved cards, save new card, etc.
inlineCheckout.configureCheckout({ customer: { email: "example@email.com" } });

// Initialize the checkout
await liteCheckout.injectCheckout();

// To verify a 3ds transaction you can use the following method
// It should be called after the injectCheckout method
// The response status will be one of the following
// ['Declined', 'Cancelled', 'Failed', 'Success', 'Pending', 'Authorized']

inlineCheckout.verify3dsTransaction().then(response => {
    console.log('Verify 3ds response', response)
})
```

```javascript
// Retrieve customer's saved cards
const cards = await liteCheckout.getCustomerCards();
```

```javascript
// Save a new card
const newCard = await liteCheckout.saveCustomerCard(cardData);
```

```javascript
// Remove a saved card
await liteCheckout.removeCustomerCard(cardId);
```

```javascript
// Get available payment methods
const paymentMethods = await liteCheckout.getCustomerPaymentMethods();
```

```javascript
// Process a payment
const paymentResponse = await liteCheckout.payment(paymentData);
```

## Configuration Options

| Property  |   Type   |                                         Description                                          |
|:---------:|:--------:|:--------------------------------------------------------------------------------------------:|
|   mode    |  string  | Environment mode. Options: 'stage', 'production', 'sandbox', 'development'. Default: 'stage' |
|  apiKey   |  string  |                            Your API key from the Tonder Dashboard                            |
| returnrl |  string  |                    URL where the checkout form is mounted (used for 3DS)                     |
| callBack  | function |         Callback function to be invoked after the payment process ends successfully.         |

## Card On File

Card On File is applied automatically when enabled for your merchant account. No extra SDK configuration is required. For saved-card UIs, you must handle CVV collection based on the card data returned by `getCustomerCards()`:

- If a saved card has `subscription_id`, CVV is not required.
- If a saved card does not have `subscription_id`, you must collect CVV and pass the card id to `payment()`, or the SDK will error.
- Only call `mountCardFields()` when the selected card does not have `subscription_id`.

Example (conditional CVV mount):
```ts
const selectedCard = cardsResponse.cards.find(
  (card) => card.fields.skyflow_id === selectedCardId
);
const needsCvv = !selectedCard?.fields?.subscription_id;

if (needsCvv) {
  liteCheckout.mountCardFields({ fields: ['cvv'], card_id: selectedCardId });
}
```

### Existing saved cards without subscription_id
Cards saved before Card On File was enabled may not have `subscription_id`. You have three options:
1) Remove the card using `removeCustomerCard()` and let the user add it again.
2) Run a payment flow that shows the full card form; the SDK will create a subscription and update the card. Note: this can generate a new `skyflow_id`, so update any references in your app.
3) Ask Tonder support to remove a specific card or all saved cards for a user.

## Mobile settings

<font size="3">If you are deploying to Android, edit your AndroidManifest.xml file to add the Internet permission.</font>

```xml
<!-- Required to fetch data from the internet. -->
<uses-permission android:name="android.permission.INTERNET" />
```

<font size="3">Likewise, if you are deploying to macOS, edit your macos/Runner/DebugProfile.entitlements and macos/Runner/Release.entitlements files to include the network client entitlement.</font>

```xml
<!-- Required to fetch data from the internet. -->
<key>com.apple.security.network.client</key>
<true>
```

## Payment Data Structure

When calling the `payment` method, use the following data structure:

### Field Descriptions

- **customer**: Object containing the customer's personal information to be registered in the transaction.

- **cart**: Object containing the total amount and an array of items to be registered in the Tonder order.

    - **total**: The total amount of the transaction.
    - **items**: An array of objects, each representing a product or service in the order.
        - name: name of the product
        - price_unit: valid float string with the price of the product
        - quantity: valid integer string with the quantity of this product

- **currency**: String representing the currency code for the transaction (e.g., "MXN" for Mexican Peso).

- **metadata**: Object for including any additional information about the transaction. This can be used for internal references or tracking.

- **card**: (for LiteCheckout) Object containing card information. This is used differently depending on whether it's a new card or a saved card:

    - For a new card: Include `card_number`, `cvv`, `expiration_month`, `expiration_year`, and `cardholder_name`.
    - For a saved card: Include only the `skyflow_id` of the saved card.
    - This is only used when not paying with a payment_method.

- **payment_method**: (for LiteCheckout) String indicating the alternative payment method to be used (e.g., "Spei"). This is only used when not paying with a card.
- **order_reference**:  Unique order reference from the merchant. Used to visually identify/filter the order in dashboard.
- **apm_config**: (Optional) Configuration object for APM-specific options. Only applicable when using alternative payment methods like Mercado Pago.
<details>
<summary>APM Config Fields - Mercado Pago</summary>

| **Field**                           | **Type**                                   | **Description**                                                           |
|-------------------------------------|--------------------------------------------|---------------------------------------------------------------------------|
| `binary_mode`                       | `boolean`                                  | If `true`, payment must be approved or rejected immediately (no pending). |
| `additional_info`                   | `string`                                   | Extra info shown during checkout and in payment details.                  |
| `back_urls`                         | `object`                                   | URLs to redirect the user after payment.                                  |
| └─ `success`                        | `string`                                   | Redirect URL after successful payment.                                    |
| └─ `pending`                        | `string`                                   | Redirect URL after pending payment.                                       |
| └─ `failure`                        | `string`                                   | Redirect URL after failed/canceled payment.                               |
| `auto_return`                       | `"approved"` \| `"all"`                    | Enables auto redirection after payment completion.                        |
| `payment_methods`                   | `object`                                   | Payment method restrictions and preferences.                              |
| └─ `excluded_payment_methods[]`     | `array`                                    | List of payment methods to exclude.                                       |
| └─ `excluded_payment_methods[].id`  | `string`                                   | ID of payment method to exclude (e.g., "visa").                           |
| └─ `excluded_payment_types[]`       | `array`                                    | List of payment types to exclude.                                         |
| └─ `excluded_payment_types[].id`    | `string`                                   | ID of payment type to exclude (e.g., "ticket").                           |
| └─ `default_payment_method_id`      | `string`                                   | Default payment method (e.g., "master").                                  |
| └─ `installments`                   | `number`                                   | Max number of installments allowed.                                       |
| └─ `default_installments`           | `number`                                   | Default number of installments suggested.                                 |
| `expires`                           | `boolean`                                  | Whether the preference has expiration.                                    |
| `expiration_date_from`              | `string` (ISO 8601)                        | Start of validity period (e.g. `"2025-01-01T12:00:00-05:00"`).            |
| `expiration_date_to`                | `string` (ISO 8601)                        | End of validity period.                                                   |
| `differential_pricing`              | `object`                                   | Configuration for differential pricing.                                   |
| └─ `id`                             | `number`                                   | ID of the differential pricing strategy.                                  |
| `marketplace`                       | `string`                                   | Marketplace identifier (default: "NONE").                                 |
| `marketplace_fee`                   | `number`                                   | Fee to collect as marketplace commission.                                 |
| `tracks[]`                          | `array`                                    | Ad tracking configurations.                                               |
| └─ `type`                           | `"google_ad"` \| `"facebook_ad"`           | Type of tracker.                                                          |
| └─ `values.conversion_id`           | `string`                                   | Google Ads conversion ID.                                                 |
| └─ `values.conversion_label`        | `string`                                   | Google Ads label.                                                         |
| └─ `values.pixel_id`                | `string`                                   | Facebook Pixel ID.                                                        |
| `statement_descriptor`              | `string`                                   | Text on payer’s card statement (max 16 characters).                       |
| `shipments`                         | `object`                                   | Shipping configuration.                                                   |
| └─ `mode`                           | `"custom"` \| `"me2"` \| `"not_specified"` | Type of shipping mode.                                                    |
| └─ `local_pickup`                   | `boolean`                                  | Enable pickup at local branch (for `me2`).                                |
| └─ `dimensions`                     | `string`                                   | Package dimensions (e.g. `10x10x10,500`).                                 |
| └─ `default_shipping_method`        | `number`                                   | Default shipping method (for `me2`).                                      |
| └─ `free_methods[]`                 | `array`                                    | Shipping methods offered for free (for `me2`).                            |
| └─ `free_methods[].id`              | `number`                                   | ID of free shipping method.                                               |
| └─ `cost`                           | `number`                                   | Shipping cost (only for `custom` mode).                                   |
| └─ `free_shipping`                  | `boolean`                                  | If `true`, shipping is free (`custom` only).                              |
| └─ `receiver_address`               | `object`                                   | Shipping address.                                                         |
| └─ `receiver_address.zip_code`      | `string`                                   | ZIP or postal code.                                                       |
| └─ `receiver_address.street_name`   | `string`                                   | Street name.                                                              |
| └─ `receiver_address.street_number` | `number`                                   | Street number.                                                            |
| └─ `receiver_address.city_name`     | `string`                                   | City name.                                                                |
| └─ `receiver_address.state_name`    | `string`                                   | State name.                                                               |
| └─ `receiver_address.country_name`  | `string`                                   | Country name.                                                             |
| └─ `receiver_address.floor`         | `string`                                   | Floor (optional).                                                         |
| └─ `receiver_address.apartment`     | `string`                                   | Apartment or unit (optional).                                             |
</details>

```javascript
const paymentData = {
  customer: {
    firstName: "John",
    lastName: "Doe",
    country: "USA",
    address: "123 Main St",
    city: "Anytown",
    state: "CA",
    postCode: "12345",
    email: "john.doe@example.com",
    phone: "1234567890",
    identification:{
        type: "CPF",
        number: "19119119100"
    }
  },
  cart: {
    total: "100.00",
    items: [
      {
        description: "Product description",
        quantity: 1,
        price_unit: "100.00",
        discount: "0.00",
        taxes: "0.00",
        product_reference: "PROD123",
        name: "Product Name",
        amount_total: "100.00",
      },
    ],
  },
  currency: "MXN",
  metadata: {
    order_id: "ORDER123",
  },
  // For a new card:
  card: {
    card_number: "4111111111111111",
    cvv: "123",
    expiration_month: "12",
    expiration_year: "25",
    cardholder_name: "John Doe",
  },
  // card: "skyflow_id" // for a selected saved card.
  // payment_method: "Spei", // For the selected payment method.
  // apm_config: {} // Optional, only for APMs like Mercado Pago, Oxxo Pay
};
```

## Field Validation Functions

For LiteCheckout implementations, the SDK provides validation functions to ensure the integrity of card data before submitting:

- `validateCardNumber(cardNumber)`: Validates the card number using the Luhn algorithm.
- `validateCardholderName(name)`: Checks if the cardholder name is valid.
- `validateCVV(cvv)`: Ensures the CVV is in the correct format.
- `validateExpirationDate(expirationDate)`: Validates the expiration date in MM/YY format.
- `validateExpirationMonth(month)`: Checks if the expiration month is valid.
- `validateExpirationYear(year)`: Validates the expiration year.

Example usage:

```javascript
import {
  validateCardNumber,
  validateCardholderName,
  validateCVV,
  validateExpirationDate,
} from "@tonder.io/ionic-lite-sdk";

const cardNumber = "4111111111111111";
const cardholderName = "John Doe";
const cvv = "123";
const expirationDate = "12/25";

if (
  validateCardNumber(cardNumber) &&
  validateCardholderName(cardholderName) &&
  validateCVV(cvv) &&
  validateExpirationDate(expirationDate)
) {
  // Proceed with payment
} else {
  // Show error message
}
```


## API Reference

### LiteCheckout Methods

- `configureCheckout(data)`: Set initial checkout data
- `injectCheckout()`: Initialize the checkout
- `getCustomerCards()`: Retrieve saved cards
- `saveCustomerCard(cardData)`: Save a new card
- `removeCustomerCard(cardId)`: Remove a saved card
- `getCustomerPaymentMethods()`: Get available payment methods
- `payment(data)`: Process a payment
- `verify3dsTransaction()`: Verify a 3DS transaction
- `mountCardFields({ fields, card_id })`: Mounts card input fields (e.g., CVV) for a saved card. Useful for requesting CVV when listing saved cards. 

#### mountCardFields

Mounts card input fields (currently CVV) for a saved card. When a `card_id` is provided, the CVV input will be associated with that specific card, allowing you to update its CVV. This is useful for workflows where you need to request CVV for saved cards before payment.

**Parameters:**

| Name    | Type     | Required | Description                                                         |
|---------|----------|----------|---------------------------------------------------------------------|
| fields  | string[] | Yes      | Array of fields to mount (currently supports `["cvv"]`).            |
| card_id | string   | No       | Card ID of the saved card. Associates the CVV input with this card. |

**Important Notes:**
1. **Single Card Selection Only:** The CVV input for a saved card must only be displayed when a specific card is selected.
2. **One CVV Input at a Time:** You cannot display multiple CVV inputs for different cards simultaneously. Only one CVV update operation should be active at any given time.
3. **Mutually Exclusive with Card Form:** The CVV input for a saved card cannot be shown at the same time as the full card enrollment form. These are two separate workflows:
   - **Save New Card:** Use the complete card form without `card_id`.
   - **Update CVV for Saved Card:** Use CVV input with `card_id` only.

**Example:**
```tsx
// Update CVV for a saved card

// 1. Place the div in your component where the CVV field will be mounted
<div id={`collect_cvv_saved-card-id`}></div>

// 2. Call mountCardFields and pass the card_id of the selected card
liteCheckout.mountCardFields({ fields: ["cvv"], card_id: "saved-card-id" });


```

## Error Handling

Public SDK methods that fail due to API/SDK execution return an `AppError` (with `name: "TonderError"`).

### Error structure

```json
{
  "status": "error",
  "name": "TonderError",
  "code": "PAYMENT_PROCESS_ERROR",
  "message": "There was an issue processing the payment.",
  "statusCode": 500,
  "details": {
    "code": "PAYMENT_PROCESS_ERROR",
    "statusCode": 500,
    "systemError": "APP_INTERNAL_001"
  }
}
```

Notes:
- `statusCode` comes from HTTP response when available; otherwise defaults to `500`.
- `details.systemError` comes from backend error code when available; otherwise defaults to `APP_INTERNAL_001`.
- In card-on-file flow failures, the SDK returns `CARD_ON_FILE_DECLINED`.

### Public method error mapping

| Method | Returned `error.code` |
|---|---|
| `payment(data)` | `PAYMENT_PROCESS_ERROR` or `CARD_ON_FILE_DECLINED` |
| `getCustomerCards()` | `FETCH_CARDS_ERROR` |
| `saveCustomerCard(cardData)` | `SAVE_CARD_ERROR` or `CARD_ON_FILE_DECLINED` |
| `removeCustomerCard(cardId)` | `REMOVE_CARD_ERROR` |
| `getCustomerPaymentMethods()` | `FETCH_PAYMENT_METHODS_ERROR` |


## Examples

Here are examples of how to implement Tonder Lite SDK:

### Angular

For Angular, we recommend using a service to manage the Tonder instance:

```typescript
// tonder.service.ts
import { Injectable } from "@angular/core";
import { LiteCheckout } from "@tonder.io/ionic-lite-sdk";
import {ILiteCheckout} from "@tonder.io/ionic-lite-sdk/dist/types/liteInlineCheckout";

@Injectable({
  providedIn: "root",
})
export class TonderService {
  private liteCheckout!: ILiteCheckout;

  constructor(@Inject(Object) private sdkParameters: IInlineLiteCheckoutOptions) {
    this.initializeInlineCheckout();
  }

  private initializeInlineCheckout(): void {
    this.liteCheckout = new LiteCheckout({ ...this.sdkParameters });
  }

  configureCheckout(customerData: IConfigureCheckout): void {
    return this.liteCheckout.configureCheckout({ ...customerData });
  }

  async injectCheckout(): Promise<void> {
    return await this.liteCheckout.injectCheckout();
  }

  verify3dsTransaction(): Promise<ITransaction | IStartCheckoutResponse | void> {
    return this.liteCheckout.verify3dsTransaction();
  }

  payment(
      checkoutData: IProcessPaymentRequest,
  ): Promise<IStartCheckoutResponse> {
      return this.inlineCheckout.payment(checkoutData);
  }

  // Add more functions, for example for lite sdk: get payment methods

  // getCustomerPaymentMethods(): Promise<IPaymentMethod[]> {
  //     return this.liteCheckout.getCustomerPaymentMethods();
  // }
}

// checkout.component.ts
import { Component, OnInit, OnDestroy } from "@angular/core";
import { TonderService } from "./tonder.service";

@Component({
  selector: "app-tonder-checkout",
  template: `
    <div id="container">
      <form [formGroup]="paymentForm">
        <div class="lite-container-tonder">
            <div id="id-name" class="empty-div">
              <label for="name">Namess: </label>
              <input id="name" type="text" formControlName="name">
            </div>
            <div id="id-cardNumber" class="empty-div">
              <label for="cardNumber">Card number: </label>
              <input id="cardNumber" type="text" formControlName="cardNumber">
            </div>
            <div class="collect-row">
              <div class="empty-div">
                <label for="month">Month: </label>
                <input id="month" type="text" formControlName="month">
              </div>
              <div class="expiration-year">
                <label for="expirationYear">Year: </label>
                <input id="expirationYear" type="text" formControlName="expirationYear">
              </div>
              <div class="empty-div">
                <label for="cvv">CVV: </label>
                <input id="cvv" type="text" formControlName="cvv">
              </div>
            </div>
          <div id="msgError">{{ errorMessage }}</div>
          <div id="msgNotification"></div>
          <div class="container-pay-button">
            <button class="lite-pay-button" (click)="onPayment($event)">Pay</button>
          </div>
        </div>
    
      </form>
    </div>
  `,
  providers: [
    {
      provide: TonderInlineService,
      // Initialization of the Tonder Lite SDK.
      // Note: Replace these credentials with your own in development/production.
      useFactory: () =>
        new TonderInlineService({
          apiKey: "11e3d3c3e95e0eaabbcae61ebad34ee5f93c3d27",
          returnUrl: "http://localhost:8100/tabs/tab5",
          mode: "stage",
        }),
    },
  ],
})
export class TonderCheckoutComponent implements OnInit, OnDestroy {
  loading = false;
  checkoutData: IProcessPaymentRequest;
  paymentForm = new FormGroup({
      name: new FormControl('Pedro Paramo'),
      cardNumber: new FormControl('4242424242424242'),
      month: new FormControl('12'),
      expirationYear: new FormControl('28'),
      cvv: new FormControl('123')
  });
  
  constructor(private tonderService: TonderService) {
      this.checkoutData = {
          customer: {
              firstName: "Jhon",
              lastName: "Doe",
              email: "john.c.calhoun@examplepetstore.com",
              phone: "+58452258525"
          },
          cart: {
              total: 25,
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
          metadata: {},
          currency: "MXN"
      }
  }

  ngOnInit() {
    this.initCheckout();
  }

  async initCheckout() {
    this.tonderService.configureCheckout({
      customer: { email: "example@email.com" },
    });
    await this.tonderService.injectCheckout();
    this.tonderService.verify3dsTransaction().then((response) => {
      console.log("Verify 3ds response", response);
    });
    
    // Calls more functions to get payment methods, saved cards, etc.
  }

  async pay() {
    this.loading = true;
    try {
      const response = await this.tonderService.payment({
          ...this.checkoutData,
          card: { // Card details, if not using a payment method.
              card_number: this.paymentForm.value.cardNumber || "",
              cvv: this.paymentForm.value.cvv || "",
              expiration_month: this.paymentForm.value.month || "",
              expiration_year: this.paymentForm.value.expirationYear || "",
              cardholder_name: this.paymentForm.value.name || ""
          },
          // card: "skyflow_id" // In case a saved card is selected.
          // payment_method: "" // Payment method if not using the card form
      });
      console.log("Payment successful:", response);
      alert("Payment successful");
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed");
    } finally {
      this.loading = false;
    }
  }
}
```

### React: Request CVV for saved card

```tsx
import { LiteCheckout } from '@tonder.io/ionic-lite-sdk';
import { useEffect, useState } from 'react';

const checkoutData = {
  customer: {
      firstName: "Adrian",
      lastName: "Martinez",
      country: "Mexico",
      address: "Pinos 507, Col El Tecuan",
      city: "Durango",
      state: "Durango",
      postCode: "34105",
      email: "test@example.com",
      phone: "8161234567",
  },
  cart: {
    total: 120,
    items: [
      {
        description: "Test product description",
        quantity: 1,
        price_unit: 120,
        discount: 25,
        taxes: 12,
        product_reference: 12,
        name: "Test product",
        amount_total: 120
      }
    ]
  },
  currency: "MXN",
  // Reference from the merchant
  order_reference: "ORD-123456",
  metadata: {
      business_user: "123456-test"
  },
};

const ExploreContainer = () => {
  const [liteCheckout, setLiteCheckout] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!liteCheckout) {
      setLoading(true);
      initializeTonderSDK();
    }
  }, []);

  useEffect(() => {
    if (liteCheckout) {
      fetchCards();
    }
  }, [liteCheckout]);

  const initializeTonderSDK = async () => {
    const sdk = new LiteCheckout({
      mode: "stage",
      apiKey: "YOUR_API_KEY",
      returnUrl: window.location.href,
      customization: { redirectOnComplete: false },
      events: {
        cvvEvents: {
          onChange: (data) => {
            console.log("CVV onChange event data:", data);
          }
        }
      }
    });
    setLiteCheckout(sdk);

    // Get secure token from your backend
    const token = "123"

    sdk.configureCheckout({ ...checkoutData, secureToken: token });
    await sdk.injectCheckout();
    sdk.verify3dsTransaction().then((response: any) => {
      console.log('Verify 3ds response', response);
    });
    setLoading(false);
  };

  const fetchCards = async () => {
    const response = await liteCheckout.getCustomerCards();
    setCards(response.cards || []);
  };

  const handleSelectCard = (cardId: string) => {
    if (cardId === selectedCardId) return;
    setSelectedCardId(cardId);
    liteCheckout.mountCardFields({ fields: ["cvv"], card_id: cardId });
  };

  const handlePayment = async () => {
    if (!selectedCardId) return;
    try {
      const response = await liteCheckout.payment({ ...checkoutData, card: selectedCardId });
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  return (
    <div className="container">
      <iframe className="tds-iframe" allowTransparency={true} id="tdsIframe"></iframe>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#007AFF' }}>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Loading checkout...</div>
        </div>
      ) : (
        <>
          <p>Saved cards:</p>
          <div style={{ marginBottom: 24 }}>
            {cards.length > 0 ? (
              cards.map((card: any) => (
                <div
                  key={card.fields.skyflow_id}
                  style={{
                    background: selectedCardId === card.fields.skyflow_id ? '#E3F2FD' : '#f9f9f9',
                    borderRadius: 12,
                    border: selectedCardId === card.fields.skyflow_id ? '2px solid #007AFF' : '2px solid transparent',
                    marginBottom: 12,
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => handleSelectCard(card.fields.skyflow_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', padding: 16 }}>
                    {card.icon && (
                      <img src={card.icon} alt="card" style={{ width: 50, height: 32, marginRight: 16, objectFit: 'contain' }} />
                    )}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>{card.fields.cardholder_name}</div>
                      <div style={{ color: '#666', marginBottom: 4 }}>•••• •••• •••• {card.fields.card_number.slice(-4)}</div>
                      <div style={{ color: '#999', fontSize: 12 }}>Expires: {card.fields.expiration_month}/{card.fields.expiration_year}</div>
                    </div>
                    {selectedCardId === card.fields.skyflow_id && (
                      <div
                        style={{ marginLeft: 12, width: 120, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 8, textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ maxHeight: '90px' }} id={`collect_cvv_${card.fields.skyflow_id}`}></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>No saved cards</div>
                <div style={{ fontSize: 14, color: '#bbb' }}>Add a card to use this method</div>
              </div>
            )}
          </div>
          <button style={{ padding: '10px', background: '#ddd' }} onClick={handlePayment}>
            Pay with saved card
          </button>
        </>
      )}
    </div>
  );
};
```


## Return secure token

```typescript
{
    access: string;
}
```

## Deprecated Fields

The following fields have been deprecated and should no longer be used. Consider using the recommended alternatives:

## Register customer card
### `apiKeyTonder` Property

- **Deprecated Reason:** The `apiKeyTonder` property in the constructor and `IInlineLiteCheckoutOptions` interface is no longer required.
- **Alternative:** Use the `apiKey` field.

### `baseUrlTonder` Property

- **Deprecated Reason:** The `baseUrlTonder` property in the constructor and `IInlineLiteCheckoutOptions` interface is no longer required.
- **Alternative:** Use the `mode` field with `stage` | `development` | `sandbox` | `production` options.

### `signal` Property

- **Deprecated Reason:** The `signal` property in the constructor and `IInlineLiteCheckoutOptions` interface is no longer required.


## Deprecated Functions

The following functions have been deprecated and should no longer be used. Consider using the recommended alternatives:

### `customerRegister`

- **Deprecated Reason:** This function is no longer necessary as registration is now automatically handled during payment processing or when using card management methods.

### `createOrder` and `createPayment`

- **Deprecated Reason:** These functions have been replaced by the `payment` function, which now automatically handles order creation and payment processing.
- **Alternative:** Use the `payment` function.

### `startCheckoutRouter` and `startCheckoutRouterFull`

- **Deprecated Reason:** These functions have been replaced by the `payment` function.
- **Alternative:** Use the `payment` function.

### `registerCustomerCard`

- **Deprecated Reason:** This function has been renamed to `saveCustomerCard` to better align with its purpose. The method's usage has also been updated.
- **Alternative:** Use the `saveCustomerCard` method and update your implementation to reflect the changes.

### `deleteCustomerCard`

- **Deprecated Reason:** This function has been renamed to `removeCustomerCard` to better align with its purpose. The method's usage has also been updated.
- **Alternative:** Use the `removeCustomerCard` method and update your implementation to reflect the changes.

### `getActiveAPMs`

- **Deprecated Reason:** This function has been renamed to `getCustomerPaymentMethods` to better align with its purpose. The method's usage has also been updated.
- **Alternative:** Use the `getCustomerPaymentMethods` method and update your implementation to reflect the changes.

### `getSkyflowTokens`

- **Deprecated Reason:** Card registration and checkout are now automatically handled during the payment process or through card management methods, making this method unnecessary.

### `getOpenpayDeviceSessionID`

- **Deprecated Reason:** It is no longer necessary to use this method is now automatically handled during the payment process.


## Notes

### General

- Replace `apiKey`, `mode`, `returnUrl` with your actual values.
- Remember to use the `configureCheckout` function after creating an instance of `LiteCheckout`. This ensures that functions such as payment processing, saving cards, deleting cards, and others work correctly.


## License

[MIT](https://choosealicense.com/licenses/mit/)
