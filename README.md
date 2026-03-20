# @tonder.io/ionic-lite-sdk

PCI DSS–compliant payment SDK for Ionic, Angular, and React.
Card data is collected through **Skyflow secure iframes** — raw card values never touch your application code.

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Installation](#2-installation)
3. [Constructor & Configuration](#3-constructor--configuration)
   - [3.1 Options reference](#31-options-reference)
   - [3.2 Customization options](#32-customization-options)
   - [3.3 Form events](#33-form-events)
4. [Initialization Sequence](#4-initialization-sequence)
5. [Collecting Card Data — `mountCardFields`](#5-collecting-card-data--mountcardfields)
   - [5.1 New-card form (all 5 fields)](#51-new-card-form-all-5-fields)
   - [5.2 Saved-card CVV only](#52-saved-card-cvv-only)
   - [5.3 Unmounting fields](#53-unmounting-fields)
6. [Processing Payments](#6-processing-payments)
   - [6.1 New card payment](#61-new-card-payment)
   - [6.2 Saved card payment](#62-saved-card-payment)
   - [6.3 Alternative Payment Method (APM)](#63-alternative-payment-method-apm)
   - [6.4 Payment response reference](#64-payment-response-reference)
7. [3DS Handling](#7-3ds-handling)
8. [Managing Saved Cards](#8-managing-saved-cards)
   - [8.1 List saved cards](#81-list-saved-cards)
   - [8.2 Save a new card](#82-save-a-new-card)
   - [8.3 Remove a card](#83-remove-a-card)
   - [8.4 Card On File (subscription_id)](#84-card-on-file-subscription_id)
9. [Revealing Card Data — `revealCardFields`](#9-revealing-card-data--revealcardfields)
10. [Error Handling](#10-error-handling)
    - [10.1 Error structure](#101-error-structure)
    - [10.2 Error code reference](#102-error-code-reference)
11. [Customization & Styling](#11-customization--styling)
    - [11.1 Global form styles](#111-global-form-styles)
    - [11.2 Per-field styles](#112-per-field-styles)
    - [11.3 Labels & placeholders](#113-labels--placeholders)
12. [Deprecated API](#12-deprecated-api)

---

## 1. Quick Start

Get a working payment form in under 5 minutes. This example uses the minimum required setup. See [Section 4](#4-initialization-sequence) for the full step-by-step explanation.

**Angular template:**

```html
<!-- 3DS iframe — only add when using redirectOnComplete: false (see Section 7).
     Remove this element if you are using the default redirectOnComplete: true. -->
<iframe id="tdsIframe" allowtransparency="true" class="tds-iframe"></iframe>

<!-- Secure iframes — card values never touch your code -->
<div id="collect_cardholder_name"></div>
<div id="collect_card_number"></div>
<div id="collect_expiration_month"></div>
<div id="collect_expiration_year"></div>
<div id="collect_cvv"></div>

<button (click)="pay()">Pay</button>
```

**Angular component:**

```typescript
import { Component, OnInit } from '@angular/core';
import { LiteCheckout, AppError } from '@tonder.io/ionic-lite-sdk';

@Component({ selector: 'app-checkout', templateUrl: './checkout.component.html' })
export class CheckoutComponent implements OnInit {
  private liteCheckout!: LiteCheckout;
  loading = false;

  async ngOnInit() {
    // Step 1 — Create instance
    this.liteCheckout = new LiteCheckout({
      apiKey: 'YOUR_PUBLIC_API_KEY',
      mode: 'stage',
      returnUrl: `${window.location.origin}/checkout`,
    });

    // Step 2 — Fetch secure token from YOUR backend (never expose YOUR_SECRET_API_KEY on the frontend)
    // Your backend calls POST https://stage.tonder.io/api/secure-token/ with the secret key
    // and returns { access: string } to the client.
    const { access } = await fetch('/api/tonder-secure-token', {
      method: 'POST',
    }).then(r => r.json());

    // Step 3 — Configure with customer + token
    this.liteCheckout.configureCheckout({
      customer: { email: 'user@example.com' },
      secureToken: access,
      // cart: { total: 100, items: [...] },
      // currency: 'MXN',
      // order_reference: 'ORD-001',           // your internal order ID — shows in Tonder dashboard & exports
      // metadata: { order_id: 'ORD-001' },    // reporting metadata — see Section 6.1
    });

    // Step 4 — Initialize checkout (must be awaited)
    await this.liteCheckout.injectCheckout();

    // Step 5 — Check if returning from a 3DS redirect
    // Only needed when redirectOnComplete: true (default). In iframe mode
    // (redirectOnComplete: false) the payment() promise resolves directly — skip this step.
    // If this page load is a return from a 3DS challenge, the SDK verifies the
    // transaction and, if routing is configured, may automatically retry with
    // the next payment route. Await the result before deciding what to do next.
    const tdsResult = await this.liteCheckout.verify3dsTransaction();
    if (tdsResult) {
      const status = (tdsResult as any).transaction_status;
      if (status === 'Success' ) {
        // navigate to order confirmation
      } else {
        // show error to the user
      }
      return; // do not mount card fields — the payment flow already completed
    }

    // Step 6 — Normal page load: mount secure card input iframes
    await this.liteCheckout.mountCardFields({
      fields: ['cardholder_name', 'card_number', 'expiration_month', 'expiration_year', 'cvv'],
    });
  }

  async pay() {
    this.loading = true;
    try {
      const response = await this.liteCheckout.payment({
        customer: { email: 'user@example.com' },
        cart: {
          total: 100,
          items: [{
            name: 'Product A', description: 'Product description',
            quantity: 1, price_unit: 100, discount: 0, taxes: 0,
            product_reference: 'SKU-001', amount_total: 100,
          }],
        },
        currency: 'MXN',
        // order_reference: 'ORD-001',           // your internal order ID — shows in Tonder dashboard & exports
        // metadata: { order_id: 'ORD-001' },    // reporting metadata — see Section 6.1
      });
      console.log('Transaction status:', response.transaction_status);
    } catch (error) {
      if (error instanceof AppError) {
        console.error(`[${error.code}] ${error.message}`);
      }
    }
  }
}
```

> **Security note:** In this example `YOUR_SECRET_API_KEY` is hardcoded for brevity. In production, move this `fetch` call to your own backend and return only the `access` token to the frontend. See [Section 4](#4-initialization-sequence).

---

## 2. Installation

```bash
npm install @tonder.io/ionic-lite-sdk
# or
yarn add @tonder.io/ionic-lite-sdk
```

---

## 3. Constructor & Configuration

### 3.1 Options reference

```typescript
import { LiteCheckout } from '@tonder.io/ionic-lite-sdk';

const liteCheckout = new LiteCheckout(options);
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `apiKey` | `string` | **Required** | — | Public API key from the Tonder Dashboard |
| `mode` | `'stage' \| 'production'` | **Required** | `'stage'` | Target environment |
| `returnUrl` | `string` | **Required for 3DS** | — | URL to which 3DS redirects return after authentication |
| `callBack` | `(response) => void` | Optional | `undefined` | Called after a successful payment or card enrollment |
| `customization` | `ILiteCustomizationOptions` | Optional | `undefined` | Styles, labels, placeholders, and redirect behavior |
| `events` | `ICardFormEvents` | Optional | `undefined` | `onChange` / `onFocus` / `onBlur` callbacks per field |
| `tdsIframeId` | `string` | Optional | `'tdsIframe'` | DOM `id` of the 3DS `<iframe>` element |

**Full example:**

```typescript
const liteCheckout = new LiteCheckout({
  apiKey: 'YOUR_PUBLIC_API_KEY',
  mode: 'production',
  returnUrl: 'https://myapp.com/checkout',
  callBack: (response) => console.log('Payment done', response),
  tdsIframeId: 'myCustomTdsFrame',
  customization: {
    redirectOnComplete: false,  // render 3DS challenge inside #tdsIframe instead of full-page redirect
    styles: { enableCardIcon: true },
  },
  events: {
    cardNumberEvents: {
      onChange: (e) => console.log('Card number valid:', e.isValid),
    },
  },
});
```

---

### 3.2 Customization options

```typescript
interface ILiteCustomizationOptions {
  styles?: IStyles;           // Field and form visual styles (see Section 11)
  labels?: IFormLabels;       // Label text per field
  placeholders?: IFormPlaceholder; // Placeholder text per field
  redirectOnComplete?: boolean;    // default: true
}
```

**`redirectOnComplete`** controls how 3DS challenges are displayed when the payment processor requires authentication:

| Value | Behavior |
|-------|----------|
| `true` (default) | SDK performs a **full-page redirect** to the 3DS challenge URL. The user leaves your app, completes authentication on the bank's page, and is sent back to `returnUrl`. |
| `false` | The 3DS challenge is rendered **inside the `#tdsIframe` element**. The user stays in your app until the challenge resolves. |

> Use `redirectOnComplete: false` when you want to keep the user inside the app (e.g., in a mobile WebView). Make sure the `#tdsIframe` is styled to cover the screen when active — see [Section 7](#7-3ds-handling).

---

### 3.3 Form events

Register callbacks to react to field state changes (validation, focus, etc.):

```typescript
interface ICardFormEvents {
  cardHolderEvents?: IInputEvents;
  cardNumberEvents?: IInputEvents;
  cvvEvents?: IInputEvents;
  monthEvents?: IInputEvents;
  yearEvents?: IInputEvents;
}

interface IInputEvents {
  onChange?: (event: IEventSecureInput) => void;
  onFocus?: (event: IEventSecureInput) => void;
  onBlur?: (event: IEventSecureInput) => void;
}

interface IEventSecureInput {
  elementType: string;  // e.g. 'CARD_NUMBER', 'CVV', 'CARDHOLDER_NAME'
  isEmpty: boolean;
  isFocused: boolean;
  isValid: boolean;
  value?: string;       // See PCI note below
}
```

> **PCI note:** In `production`, all fields return `value: ''` except `card_number`, which returns a masked value (first digits only). In `stage`, `development`, and `sandbox`, `value` is fully populated for all fields. Use `isValid` and `isEmpty` for UI state logic — never depend on `value` in production.

**Example — live card form validation:**

```typescript
events: {
  cardNumberEvents: {
    onChange: (e) => { this.cardNumberValid = e.isValid; },
    onBlur: (e) => { this.showCardNumberError = !e.isValid && !e.isEmpty; },
  },
  cvvEvents: {
    onChange: (e) => { this.cvvValid = e.isValid; },
  },
}
```

---

## 4. Initialization Sequence

The SDK must be initialized in this exact order before any other method is called:

```
1. new LiteCheckout(options)
        ↓
2. fetch baseUrl/api/secure-token/   →  { access: string }
        ↓
3. configureCheckout({ customer, secureToken, ...optional })
        ↓
4. await injectCheckout()            (must be awaited)
        ↓
5. result = await verify3dsTransaction()  (redirectOnComplete: true only — void on normal loads)
        ↓ if result → handle and return early; if void → continue ↓
6. await mountCardFields(...)            (mounts secure iframes into your divs)
```

**Base URL by environment:**

| `mode` | Base URL |
|--------|---------|
| `'stage'` | `https://stage.tonder.io` |
| `'production'` | `https://app.tonder.io` |

---

### Fetching the secure token

The secure token is a short-lived credential required for `configureCheckout`. Fetch it from Tonder's API using your **secret API key** in the `Authorization` header:

```typescript
const { access } = await fetch(`${baseUrl}/api/secure-token/`, {
  method: 'POST',
  headers: {
    'Authorization': 'Token YOUR_SECRET_API_KEY',
    'Content-Type': 'application/json',
  },
}).then(r => r.json());
```

> **Security note:** `YOUR_SECRET_API_KEY` is a server-side credential. In production, make this request from your own backend and return only the `access` token to the frontend. Never expose your secret key in client-side code.

---

### `injectCheckout()`

Initializes the checkout session. Must be **awaited** before calling `mountCardFields`.

```typescript
await liteCheckout.injectCheckout();
```

> **Important:** Calling `mountCardFields()` before `injectCheckout()` resolves will throw `SKYFLOW_NOT_INITIALIZED`.

---

### `configureCheckout(data)`

Sets the customer identity and secure token for the current session. Fields like `cart`, `currency`, `metadata`, and `order_reference` can also be passed here as defaults — any field provided again in `payment()` will override them.

```typescript
interface IConfigureCheckout {
  customer: { email: string } | ICustomer;  // Required — minimum: { email }
  secureToken: string;                       // Required — from the token fetch
  cart?: { total: number | string; items: IItem[] };
  currency?: string;
  order_reference?: string;  // your internal order ID — shown in Tonder dashboard & exports
  metadata?: Record<string, any>; // reporting fields — see Section 6.1
  card?: string;           // skyflow_id — pre-selects a saved card for payment()
  payment_method?: string; // APM identifier — pre-selects an APM for payment()
}
```

```typescript
liteCheckout.configureCheckout({
  customer: { email: 'user@example.com' },
  secureToken: access,
});
```

---

### `verify3dsTransaction()`

Only relevant when `redirectOnComplete: true` (the default). When using `redirectOnComplete: false` (iframe mode), `payment()` resolves the promise directly after the challenge completes — skip this call entirely.

When using the default mode, call this on **every page load**. If the page was loaded as a return from a 3DS redirect, it verifies the transaction and — if the merchant has routing configured and the transaction was declined — **automatically retries with the next payment route**. Resolves with the final transaction result, or `void` on a normal (non-3DS) page load.

```typescript
const result = await liteCheckout.verify3dsTransaction();

if (result) {
  // Returning from 3DS — routing may have been applied automatically
  const status = (result as any).transaction_status;
  if (status === 'Success') {
    // navigate to confirmation
  } else {
    // show error
  }
  return; // do not proceed to mountCardFields
}

// Normal page load — continue with checkout initialization
await liteCheckout.mountCardFields({ ... });
```

---

## 5. Collecting Card Data — `mountCardFields`

Mounts secure iframes into your `<div>` containers. Card values are captured directly inside the iframe and **never pass through your application code**.

> **Prerequisite:** The container `<div>` elements must exist in the DOM before calling `mountCardFields()`.

```typescript
interface IMountCardFieldsRequest {
  fields: (CardField | { field: CardField; container_id?: string })[];
  card_id?: string;           // Omit for new card; provide skyflow_id for saved-card CVV
  unmount_context?: 'all' | 'current' | 'create' | string; // default: 'all'
}

type CardField =
  | 'cardholder_name'
  | 'card_number'
  | 'expiration_month'
  | 'expiration_year'
  | 'cvv';
```

---

### 5.1 New-card form (all 5 fields)

**Default container IDs** (used when no custom `container_id` is provided):

| Field | Default Container ID |
|-------|---------------------|
| `cardholder_name` | `#collect_cardholder_name` |
| `card_number` | `#collect_card_number` |
| `expiration_month` | `#collect_expiration_month` |
| `expiration_year` | `#collect_expiration_year` |
| `cvv` | `#collect_cvv` |

**HTML:**
```html
<div id="collect_cardholder_name"></div>
<div id="collect_card_number"></div>
<div id="collect_expiration_month"></div>
<div id="collect_expiration_year"></div>
<div id="collect_cvv"></div>
```

**TypeScript — shorthand (string array):**
```typescript
await liteCheckout.mountCardFields({
  fields: ['cardholder_name', 'card_number', 'expiration_month', 'expiration_year', 'cvv'],
});
```

**TypeScript — custom container IDs:**
```typescript
await liteCheckout.mountCardFields({
  fields: [
    { field: 'cardholder_name', container_id: '#my-name' },
    { field: 'card_number',     container_id: '#my-card-number' },
    { field: 'expiration_month', container_id: '#my-month' },
    { field: 'expiration_year',  container_id: '#my-year' },
    { field: 'cvv',              container_id: '#my-cvv' },
  ],
});
```

---

### 5.2 Saved-card CVV only

For saved-card payments, mount only the CVV field for the selected card. The default container ID is `#collect_cvv_<skyflow_id>`.

```html
<!-- Use the card's skyflow_id as part of the container id -->
<div id="collect_cvv_abc123"></div>
```

```typescript
liteCheckout.mountCardFields({
  fields: ['cvv'],
  card_id: 'abc123',  // card.fields.skyflow_id
});
```

> **Note:** Cards with `subscription_id` do not require CVV entry. See [Section 8.4](#84-card-on-file-subscription_id).

**Conditional CVV mount pattern:**
```typescript
handleSelectCard(card: ICard) {
  if (this.selectedCard?.fields?.skyflow_id === card.fields.skyflow_id) return;
  this.selectedCard = card;

  // Only mount CVV for cards that don't have a Card On File subscription
  if (!card.fields.subscription_id) {
    this.liteCheckout.mountCardFields({
      fields: ['cvv'],
      card_id: card.fields.skyflow_id,
    });
  }
}
```

---

### 5.3 Unmounting fields

`mountCardFields()` automatically unmounts previously mounted fields before mounting new ones — you don't need to call `unmountCardFields()` manually when switching between cards or modes.

The `unmount_context` parameter on `mountCardFields` controls what gets cleared before the new fields are mounted:

| `unmount_context` | What gets unmounted before mounting |
|-------------------|-------------------------------------|
| `'all'` (default) | All mounted fields across all contexts |
| `'current'` | Only the current context (new-card or the active saved-card CVV) |
| `'create'` | New-card form fields only |
| `'update:skyflow_id'` | CVV field for a specific saved card |

**The only case where you call `unmountCardFields()` directly** is when navigating away from the checkout screen without remounting:

```typescript
ngOnDestroy() {
  this.liteCheckout.unmountCardFields();
}
```

> **Important notes:**
> 1. Never show the new-card form (all 5 fields) and a saved-card CVV field simultaneously.
> 2. Only one saved-card CVV input should be active at a time.
> 3. Always `mountCardFields()` and let the user fill in the fields **before** calling `payment()` or `saveCustomerCard()`.

---

## 6. Processing Payments

### 6.1 New card payment

**Prerequisites:** [Section 5.1](#51-new-card-form-all-5-fields) — all 5 card fields must be mounted and filled by the user.

```typescript
interface IProcessPaymentRequest {
  customer: ICustomer | { email: string };         // Required
  cart: { total: string | number; items: IItem[] }; // Required
  currency?: string;                               // Optional — ISO code e.g. 'MXN'
  order_reference?: string | null;                 // Recommended — your internal order ID; shown in Tonder dashboard, filters, and exports
  metadata?: Record<string, any>;                  // Recommended — fields shown in Tonder transaction exports (see table below)
  isSandbox?: boolean;                             // Optional — Openpay sandbox mode
  apm_config?: Record<string, any>;                // Optional — APM-specific config (Mercado Pago, etc.)
  // card — OMIT for new-card payment
  // payment_method — OMIT for card payment
}
```

#### Metadata for Reporting

To ensure proper visibility in Tonder's **transaction and dispute reports**, pass the following fields inside `metadata`. They are included in exported reports and help link transactions to customer activity, business users, and external systems.

| Field | Type | Report column | Description |
|-------|------|---------------|-------------|
| `order_reference` | `string` | Business Transaction ID | Merchant's internal order ID. Shown in Tonder dashboard filters and exports. Recommended on every payment. |
| `metadata.order_id` | `string` | Business Transaction ID | Takes precedence over `order_reference` when both are provided. |
| `metadata.operation_date` | `Date \| string` | Customer ID (metadata) | Business operation date for reporting and reconciliation. |
| `metadata.customer_email` | `string` | Customer Email | Overrides the email shown in reports. Falls back to `customer.email` if omitted. |
| `metadata.business_user` | `string` | Business User (metadata) | Internal user or system that initiated the payment (e.g. POS terminal ID, cashier ID). |
| `metadata.customer_id` | `string` | Customer ID (metadata) | Your internal customer identifier — correlates payments with customer records. |

> **Tip:** At minimum, pass `order_reference` on every payment so your orders appear correctly in Tonder's dashboard and exports.

**`ICustomer`:**
```typescript
type ICustomer = {
  firstName: string;   // Required
  lastName: string;    // Required
  email: string;       // Required
  phone?: string;
  country?: string;
  street?: string;
  city?: string;
  state?: string;
  postCode?: string;
  address?: string;
  identification?: { type: string; number: string };
};
```

**`IItem`:**
```typescript
interface IItem {
  name: string;
  description: string;
  quantity: number;
  price_unit: number;
  amount_total: number;
  discount: number;
  taxes: number;
  product_reference: string | number;
}
```

**Example:**
```typescript
async pay() {
  this.loading = true;
  try {
    const response = await this.liteCheckout.payment({
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1 555 0100',
        country: 'MX',
        city: 'CDMX',
        street: '123 Main St',
        state: 'CMX',
        postCode: '06600',
      },
      cart: {
        total: 150,
        items: [{
          name: 'Product A',
          description: 'Product description',
          quantity: 1,
          price_unit: 150,
          discount: 0,
          taxes: 0,
          product_reference: 'SKU-001',
          amount_total: 150,
        }],
      },
      currency: 'MXN',
      metadata: { order_id: 'ORD-789' },
      order_reference: 'ORD-789',
    });
    console.log('Transaction status:', response.transaction_status);
  } catch (error) {
    if (error instanceof AppError) {
      console.error(error.code, error.message);
      this.errorMessage = error.message;
    }
  } finally {
    this.loading = false;
  }
}
```

---

### 6.2 Saved card payment

**Prerequisites:** Fetch saved cards ([Section 8.1](#81-list-saved-cards)). Conditionally mount the CVV field ([Section 5.2](#52-saved-card-cvv-only)).

```typescript
const response = await this.liteCheckout.payment({
  customer: { email: 'user@example.com' },
  cart: { total: 100, items: [...] },
  currency: 'MXN',
  card: selectedCard.fields.skyflow_id,  // the only addition vs. new card
});
```

---

### 6.3 Alternative Payment Method (APM)

No `mountCardFields()` call is needed for APM payments.

```typescript
// 1. Fetch available APMs
const apms = await this.liteCheckout.getCustomerPaymentMethods();
// IPaymentMethod = { id, payment_method, priority, category, icon, label }

// 2. User selects an APM

// 3. Pay
const response = await this.liteCheckout.payment({
  customer: { email: 'user@example.com' },
  cart: { total: 100, items: [...] },
  currency: 'MXN',
  payment_method: selectedApm.payment_method,  // e.g. 'Spei'
});
```

**Mercado Pago — `apm_config`:**

Pass Mercado Pago-specific preferences via `apm_config`:

```typescript
const response = await this.liteCheckout.payment({
  ...paymentData,
  payment_method: 'MercadoPago',
  apm_config: {
    back_urls: {
      success: 'https://myapp.com/success',
      pending: 'https://myapp.com/pending',
      failure: 'https://myapp.com/failure',
    },
    auto_return: 'approved',
  },
});
```

<details>
<summary>Full Mercado Pago <code>apm_config</code> fields</summary>

| Field | Type | Description |
|-------|------|-------------|
| `binary_mode` | `boolean` | If `true`, payment must be approved or rejected immediately (no pending state) |
| `additional_info` | `string` | Extra info shown during checkout |
| `back_urls.success` | `string` | Redirect URL after successful payment |
| `back_urls.pending` | `string` | Redirect URL after pending payment |
| `back_urls.failure` | `string` | Redirect URL after failed/canceled payment |
| `auto_return` | `'approved' \| 'all'` | Enable auto-redirect after payment completion |
| `payment_methods.excluded_payment_methods[].id` | `string` | Payment method to exclude (e.g. `'visa'`) |
| `payment_methods.excluded_payment_types[].id` | `string` | Payment type to exclude (e.g. `'ticket'`) |
| `payment_methods.default_payment_method_id` | `string` | Default payment method (e.g. `'master'`) |
| `payment_methods.installments` | `number` | Max installments allowed |
| `payment_methods.default_installments` | `number` | Default installments suggested |
| `expires` | `boolean` | Whether the preference has an expiration |
| `expiration_date_from` | `string` (ISO 8601) | Start of validity period |
| `expiration_date_to` | `string` (ISO 8601) | End of validity period |
| `statement_descriptor` | `string` | Text on payer's card statement (max 16 chars) |
| `marketplace` | `string` | Marketplace identifier (default: `'NONE'`) |
| `marketplace_fee` | `number` | Fee to collect as marketplace commission |
| `differential_pricing.id` | `number` | Differential pricing strategy ID |
| `shipments.mode` | `'custom' \| 'me2' \| 'not_specified'` | Shipping mode |
| `shipments.local_pickup` | `boolean` | Enable local branch pickup |
| `shipments.cost` | `number` | Shipping cost (custom mode only) |
| `shipments.free_shipping` | `boolean` | Free shipping flag (custom mode only) |
| `tracks[].type` | `'google_ad' \| 'facebook_ad'` | Ad tracker type |
| `tracks[].values.conversion_id` | `string` | Google Ads conversion ID |
| `tracks[].values.pixel_id` | `string` | Facebook Pixel ID |

</details>

---

### 6.4 Payment response reference

```typescript
interface IStartCheckoutResponse {
  status: string;
  message: string;
  transaction_status: string;   // 'Success' | 'Pending' | 'Declined' | 'Failed' 
  transaction_id: number;
  payment_id: number;
  checkout_id: string;
  is_route_finished: boolean;
  provider: string;
  psp_response: Record<string, any>;  // Raw response from the payment processor
}
```

> **Note:** 3DS authentication is handled automatically by the SDK. You do not need to handle redirection yourself.

---

## 7. 3DS Handling

When a payment requires 3DS authentication, the SDK handles the challenge automatically. There are two display modes, controlled by [`redirectOnComplete`](#32-customization-options):

| `redirectOnComplete` | Challenge display | User experience |
|----------------------|-------------------|-----------------|
| `true` (default) | Full-page redirect to bank's 3DS page | User leaves the app; returns to `returnUrl` after completing auth |
| `false` | Rendered inside `#tdsIframe` in your app | User stays in app until the challenge resolves |

### `redirectOnComplete: true` (default — full-page redirect)

No additional template changes required. Set `returnUrl` in the constructor and call `verify3dsTransaction()` on every page load — see [Section 4 — `verify3dsTransaction()`](#verify3dstransaction) for the full implementation pattern.

**How it works:** `payment()` redirects the browser to the bank's authentication page. After authentication, the bank sends the user back to `returnUrl`. On that page load, `verify3dsTransaction()` completes the verification — if routing is configured and the transaction was declined, it automatically retries with the next route.

---

### `redirectOnComplete: false` (iframe mode — user stays in app)

Recommended for **Ionic / mobile WebViews** where a full-page redirect would break the app flow.

**1. Add the iframe to your template:**
```html
<iframe id="tdsIframe" allowtransparency="true" class="tds-iframe"></iframe>
```

**2. Add CSS — hidden by default, shown full-screen when the challenge activates:**
```css
.tds-iframe {
  display: none;
  border: none;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100;
  background: white;
}
```

In this mode the SDK resolves the original `payment()` promise directly when the challenge completes — `verify3dsTransaction()` is not needed.

---

## 8. Managing Saved Cards

### 8.1 List saved cards

```typescript
getCustomerCards(): Promise<ICustomerCardsResponse>
```

```typescript
interface ICustomerCardsResponse {
  user_id: number;
  cards: ICard[];
}

interface ICard {
  fields: ICardSkyflowFields;
  icon?: string;  // URL to card brand image
}

interface ICardSkyflowFields {
  skyflow_id: string;
  card_number: string;         // Masked — e.g. 'XXXX-XXXX-XXXX-4242'
  cardholder_name: string;
  expiration_month: string;    // e.g. '12'
  expiration_year: string;     // e.g. '25'
  card_scheme: string;         // e.g. 'VISA', 'MASTERCARD'
  subscription_id?: string;    // Present when Card On File is activated on your merchant account — see Section 8.4
}
```

**Example:**
```typescript
const { cards } = await this.liteCheckout.getCustomerCards();

cards.forEach((card) => {
  const lastFour = card.fields.card_number.slice(-4);
  const expiry = `${card.fields.expiration_month}/${card.fields.expiration_year}`;
  console.log(`${card.fields.card_scheme} •••• ${lastFour} — expires ${expiry}`);
});
```

---

### 8.2 Save a new card

**Prerequisites:** All 5 card fields must be mounted via `mountCardFields()` with no `card_id`, and the user must have filled them in.

```typescript
saveCustomerCard(): Promise<ISaveCardResponse>
// Returns: { skyflow_id: string; user_id: number }
```

**Complete enrollment flow:**
```typescript
// 1. Mount all 5 fields (see Section 5.1)
await this.liteCheckout.mountCardFields({
  fields: ['cardholder_name', 'card_number', 'expiration_month', 'expiration_year', 'cvv'],
});

// 2. User fills in the card form...

// 3. Save the card
const saved = await this.liteCheckout.saveCustomerCard();
console.log('Saved card skyflow_id:', saved.skyflow_id);

// 4. Optionally reveal the saved card data (see Section 9)
await this.liteCheckout.revealCardFields({
  fields: ['card_number', 'cardholder_name', 'expiration_month', 'expiration_year'],
});
```

---

### 8.3 Remove a card

```typescript
removeCustomerCard(skyflowId: string): Promise<string>
// skyflowId = card.fields.skyflow_id from getCustomerCards()
```

```typescript
await this.liteCheckout.removeCustomerCard(card.fields.skyflow_id);
// Refresh the card list after removal
const { cards } = await this.liteCheckout.getCustomerCards();
```

---

### 8.4 Card On File (`subscription_id`)

Card On File is a feature that Tonder activates on your merchant account. When active, saved cards receive a `subscription_id` — these cards do **not** require CVV entry on subsequent payments.

**Conditional CVV rule:**

| `subscription_id` present | CVV required? | Action |
|--------------------------|--------------|--------|
| Yes | No | Call `payment()` directly with `card: skyflow_id` |
| No | Yes | Mount CVV with `mountCardFields({ fields: ['cvv'], card_id })` first |

```typescript
const selectedCard = cards.find(c => c.fields.skyflow_id === selectedId);

if (!selectedCard.fields.subscription_id) {
  // Need CVV — mount the field
  await this.liteCheckout.mountCardFields({
    fields: ['cvv'],
    card_id: selectedCard.fields.skyflow_id,
  });
}

// Then pay
await this.liteCheckout.payment({
  ...customerCartData,
  card: selectedCard.fields.skyflow_id,
});
```

**Legacy cards without `subscription_id`**

Cards saved before Card On File was enabled may not have `subscription_id`. You have three options:

1. Remove the card with `removeCustomerCard()` and let the user re-enroll.
2. Run a full new-card payment flow — the SDK creates a subscription and updates the card. Note: this may generate a new `skyflow_id`; update any stored references in your app.
3. Contact Tonder support to migrate specific cards.

---

## 9. Revealing Card Data — `revealCardFields`

After a successful `saveCustomerCard()` or `payment()` with a **new card**, use `revealCardFields()` to display the card data in your UI through secure iframes — raw card values are never exposed to your application.

> **When to call:** Only after a successful `saveCustomerCard()` or new-card `payment()`. Calling it without a prior successful card operation throws `MOUNT_COLLECT_ERROR`.

**Default container IDs and fixed redaction:**

| Field | Default Container ID | Redaction Applied |
|-------|---------------------|-------------------|
| `card_number` | `#reveal_card_number` | `MASKED` — e.g. `4111 11•• •••• 1234` |
| `cardholder_name` | `#reveal_cardholder_name` | `PLAIN_TEXT` |
| `expiration_month` | `#reveal_expiration_month` | `PLAIN_TEXT` |
| `expiration_year` | `#reveal_expiration_year` | `PLAIN_TEXT` |

> **PCI note:** `cvv` cannot be revealed — PCI DSS Requirement 3.2.1 prohibits storing or displaying CVV post-authorization. Redaction levels are fixed by the SDK and **cannot be overridden**.

> **Note:** Reveal elements only support `base`, `copyIcon`, and `global` style variants (unlike Collect elements which also support `focus`, `complete`, `invalid`, etc.).

**Types:**

```typescript
type RevealableCardField = 'card_number' | 'cardholder_name' | 'expiration_month' | 'expiration_year';

interface IRevealCardFieldsRequest {
  fields: (RevealableCardField | IRevealCardField)[];
  styles?: IRevealElementStyles;  // Applied to all fields unless overridden per-field
}

interface IRevealCardField {
  field: RevealableCardField;
  container_id?: string;          // default: #reveal_<field>
  altText?: string;               // Placeholder text shown before reveal() resolves
  label?: string;                 // Label rendered above the field
  styles?: IRevealElementStyles;  // Per-field override; takes priority over request.styles
}

interface IRevealElementStyles {
  inputStyles?: {
    base?: Record<string, any>;
    copyIcon?: Record<string, any>;
    global?: Record<string, any>;
  };
  labelStyles?: { base?: Record<string, any>; global?: Record<string, any> };
  errorTextStyles?: { base?: Record<string, any>; global?: Record<string, any> };
}
```

**Example 1 — Basic (shorthand):**

```html
<div id="reveal_cardholder_name"></div>
<div id="reveal_card_number"></div>
<div id="reveal_expiration_month"></div>
<div id="reveal_expiration_year"></div>
```

```typescript
await this.liteCheckout.saveCustomerCard();

// Reveal immediately after saving
await this.liteCheckout.revealCardFields({
  fields: ['cardholder_name', 'card_number', 'expiration_month', 'expiration_year'],
});
// #reveal_card_number shows "4111 11•• •••• 1234"
// #reveal_cardholder_name shows "John Doe"
```

**Example 2 — With `altText` and `label` per field:**

```typescript
await this.liteCheckout.revealCardFields({
  fields: [
    { field: 'card_number', altText: '•••• •••• •••• ••••', label: 'Card Number' },
    { field: 'cardholder_name', altText: 'Loading…', label: 'Cardholder' },
    { field: 'expiration_month', label: 'Month' },
    { field: 'expiration_year', label: 'Year' },
  ],
});
```

**Example 3 — Custom styles:**

```typescript
await this.liteCheckout.revealCardFields({
  fields: ['card_number', 'cardholder_name', 'expiration_month', 'expiration_year'],
  styles: {
    inputStyles: {
      base: {
        color: '#ffffff',
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        background: 'transparent',
        letterSpacing: '2px',
      },
    },
  },
});
```

**Example 4 — Custom container IDs:**

```typescript
await this.liteCheckout.revealCardFields({
  fields: [
    { field: 'card_number', container_id: '#my-card-display' },
    { field: 'cardholder_name', container_id: '#my-name-display' },
  ],
});
```

---

## 10. Error Handling

### 10.1 Error structure

When a public SDK method fails, it throws an `AppError` instance with the following shape:

```json
{
  "name": "TonderError",
  "status": "error",
  "code": "PAYMENT_PROCESS_ERROR",
  "message": "There was an issue processing the payment.",
  "statusCode": 500,
  "details": { ... }
}
```

**Notes:**
- `statusCode` reflects the HTTP status when available; defaults to `500` for non-HTTP errors.
- `details` contains additional context about the error when available.

**TypeScript catch pattern:**

```typescript
import { AppError } from '@tonder.io/ionic-lite-sdk';

try {
  const response = await this.liteCheckout.payment(data);
} catch (error) {
  if (error instanceof AppError) {
    console.error(`[${error.code}] ${error.message} (HTTP ${error.statusCode})`);
    // Use error.code to show a user-friendly message
  }
}
```

---

### 10.2 Error code reference

| Code | Thrown by | When |
|------|-----------|------|
| `PAYMENT_PROCESS_ERROR` | `payment()` | Any payment failure |
| `CARD_ON_FILE_DECLINED` | `payment()`, `saveCustomerCard()` | Card On File authorization declined (only when Card On File is active on your account) |
| `MOUNT_COLLECT_ERROR` | `mountCardFields()`, `revealCardFields()` | Secure fields fail to mount, or `revealCardFields()` called without a prior successful card operation |
| `SAVE_CARD_ERROR` | `saveCustomerCard()` | Any error during card save |
| `FETCH_CARDS_ERROR` | `getCustomerCards()` | Request to fetch saved cards fails |
| `REMOVE_CARD_ERROR` | `removeCustomerCard()` | Request to remove a card fails |
| `FETCH_PAYMENT_METHODS_ERROR` | `getCustomerPaymentMethods()` | Request to fetch APMs fails |

---

## 11. Customization & Styling

### 11.1 Global form styles

Apply styles to all card input fields at once via `customization.styles.cardForm`. Per-field overrides (Section 11.2) take priority.

`cardForm` uses wrapper keys (`inputStyles`, `labelStyles`, `errorStyles`) defined by `ILiteCardFormStyles`. Per-field keys like `cardholderName`, `cardNumber`, `cvv`, etc. are directly `CollectInputStylesVariant` — no wrapper.

```typescript
new LiteCheckout({
  apiKey: 'YOUR_KEY',
  mode: 'production',
  returnUrl: 'https://myapp.com/checkout',
  customization: {
    styles: {
      // Show card brand icon inside the card_number field (default: true)
      enableCardIcon: true,

      cardForm: {
        // Base typography applied to all fields
        base: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          color: '#1d1d1f',
        },
        // Styles applied to the <input> element inside each iframe
        inputStyles: {
          base: {
            border: '1px solid #d1d1d6',
            borderRadius: '8px',
            padding: '10px 12px',
            backgroundColor: '#ffffff',
          },
          focus: {
            borderColor: '#6200ee',
            boxShadow: '0 0 0 3px rgba(98, 0, 238, 0.15)',
            outline: 'none',
          },
          complete: {
            borderColor: '#34c759',
          },
          invalid: {
            borderColor: '#ff3b30',
            color: '#ff3b30',
          },
          empty: {
            borderColor: '#d1d1d6',
          },
        },
        // Styles applied to the field label
        labelStyles: {
          base: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#6e6e73',
            marginBottom: '4px',
          },
        },
        // Styles applied to the validation error message
        errorStyles: {
          base: {
            color: '#ff3b30',
            fontSize: '11px',
            marginTop: '4px',
          },
        },
      },
    },
  },
});
```

---

### 11.2 Per-field styles

Override styles for individual fields using the field keys in `IStyles`. These take priority over `cardForm` styles and use the **same structure as `cardForm`** (`inputStyles`, `labelStyles`, `errorStyles`), so you can override the label and error text per field as well.

**Per-field keys in `IStyles`:**

| Key | Field |
|-----|-------|
| `cardholderName` | Cardholder name field |
| `cardNumber` | Card number field |
| `cvv` | CVV field |
| `expirationMonth` | Expiration month field |
| `expirationYear` | Expiration year field |

**Example — highlight CVV with a different color scheme and custom label:**

```typescript
customization: {
  styles: {
    cvv: {
      inputStyles: {
        base:     { borderColor: '#8e44ad', backgroundColor: '#faf5ff' },
        focus:    { borderColor: '#6c3483', boxShadow: '0 0 0 3px rgba(108,52,131,0.2)' },
        invalid:  { borderColor: '#e74c3c', color: '#e74c3c' },
        complete: { borderColor: '#27ae60' },
      },
      labelStyles: {
        base: { color: '#8e44ad', fontWeight: '600' },
      },
      errorStyles: {
        base: { color: '#e74c3c', fontSize: '11px' },
      },
    },
  },
}
```

**Example — card number with custom input and icon styles:**

```typescript
customization: {
  styles: {
    cardNumber: {
      inputStyles: {
        base:    { letterSpacing: '2px', fontFamily: '"Courier New", monospace' },
        cardIcon: { width: '32px', height: '20px' },
      },
    },
    expirationMonth: {
      inputStyles: {
        base: { textAlign: 'center' },
      },
    },
    expirationYear: {
      inputStyles: {
        base: { textAlign: 'center' },
      },
    },
  },
}
```

---

### 11.3 Labels & placeholders

```typescript
interface IFormLabels {
  name?: string;              // Label for cardholder name field
  card_number?: string;       // Label for card number field
  cvv?: string;               // Label for CVV field
  expiry_date?: string;       // Shared expiry label (if shown as one field)
  expiration_month?: string;  // Label for expiration month field
  expiration_year?: string;   // Label for expiration year field
}

interface IFormPlaceholder {
  name?: string;              // Placeholder for cardholder name
  card_number?: string;       // Placeholder for card number
  cvv?: string;               // Placeholder for CVV
  expiration_month?: string;  // Placeholder for expiration month
  expiration_year?: string;   // Placeholder for expiration year
}
```

**Example:**

```typescript
customization: {
  labels: {
    name: 'Cardholder Name',
    card_number: 'Card Number',
    cvv: 'Security Code (CVV)',
    expiration_month: 'Month',
    expiration_year: 'Year',
  },
  placeholders: {
    name: 'John Doe',
    card_number: '4111 1111 1111 1111',
    cvv: '•••',
    expiration_month: 'MM',
    expiration_year: 'YY',
  },
}
```

---

## 12. Deprecated API

<details>
<summary>Deprecated API — click to expand</summary>

### Deprecated constructor properties

| Property | Replacement | Notes |
|----------|-------------|-------|
| `apiKeyTonder` | `apiKey` | Renamed for clarity |
| `baseUrlTonder` | `mode` | Replaced by environment enum (`'stage'` \| `'production'` \| ...) |
| `signal` | (removed) | AbortController signal is no longer needed |

### Deprecated methods

| Deprecated Method | Use Instead | Notes |
|------------------|-------------|-------|
| `getBusiness()` | (auto-handled) | No longer needed |
| `customerRegister(email)` | (auto-handled) | No longer needed |
| `createOrder(items)` | `payment()` | Replaced by unified `payment()` |
| `createPayment(items)` | `payment()` | Replaced by unified `payment()` |
| `startCheckoutRouter(data)` | `payment()` | Replaced by unified `payment()` |
| `startCheckoutRouterFull(data)` | `payment()` | Replaced by unified `payment()` |
| `registerCustomerCard(secureToken, customerToken, data)` | `saveCustomerCard()` | Signature changed; call `mountCardFields()` first |
| `deleteCustomerCard(customerToken, skyflowId)` | `removeCustomerCard(skyflowId)` | Signature simplified |
| `getActiveAPMs()` | `getCustomerPaymentMethods()` | Renamed |
| `getSkyflowTokens(...)` | (auto-handled) | No longer needed |
| `getOpenpayDeviceSessionID(...)` | (auto-handled) | No longer needed |

### Deprecated data patterns

**Raw card fields in `payment()` / `saveCustomerCard()`**

Passing raw card values (card number, CVV, etc.) directly to these methods is no longer supported. Card data must be collected via `mountCardFields()` first:

```typescript
// ❌ Deprecated
await liteCheckout.payment({ ..., card: { card_number: '4111...', cvv: '123', ... } });

// ✅ Current
await liteCheckout.mountCardFields({ fields: ['cardholder_name', 'card_number', 'expiration_month', 'expiration_year', 'cvv'] });
// user fills in the form
await liteCheckout.payment({ customer, cart, currency });
```

**`returnUrl` in `IProcessPaymentRequest`**

Set `returnUrl` on the constructor instead of per-payment:

```typescript
// ❌ Deprecated
await liteCheckout.payment({ ..., returnUrl: 'https://myapp.com/done' });

// ✅ Current — set on constructor
new LiteCheckout({ apiKey, mode, returnUrl: 'https://myapp.com/done' });
```

</details>

