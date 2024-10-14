# Tonder SDK

Tonder SDK helps to integrate the services Tonder offers in your own mobile app


## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Configuration Options](#configuration-options)
4. [Mobile Settings](#mobile-settings)
5. [Payment Data Structure](#payment-data-structure)
6. [Field Validation Functions](#field-validation-functions)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Deprecated Fields](#deprecated-fields)
10. [Deprecated Functions](#deprecated-functions)
11. [License](#license)


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
  publicApiKeyTonder
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
|  publicApiKey   |  string  |                            Your API key from the Tonder Dashboard                            |
| returnrl |  string  |                    URL where the checkout form is mounted (used for 3DS)                     |
| callBack  | function |         Callback function to be invoked after the payment process ends successfully.         |

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

## Request secure token

```typescript

const jsonResponse = await liteCheckout.getSecureToken(
  secretApiKey //You can take this from you Tonder Dashboard 
);

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

### Script Dependencies

For all implementations, ensure you include the necessary scripts:

```html
<script src="https://openpay.s3.amazonaws.com/openpay.v1.min.js"></script>
<script src="https://openpay.s3.amazonaws.com/openpay-data.v1.min.js"></script>
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
