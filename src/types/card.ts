export interface ICard {
    fields: ICardSkyflowFields;
    icon?: string;
}

export interface ICardSkyflowFields {
    card_number: string;
    expiration_month: string;
    expiration_year: string;
    skyflow_id: string;
    card_scheme: string;
    cardholder_name: string;
    subscription_id?: string;
}

export interface ICustomerCardsResponse {
    user_id: number;
    cards: ICard[];
}

export interface ISaveCardResponse {
    skyflow_id: string;
    user_id: number;
}

export interface ISaveCardInternalResponse {
    skyflow_id: string;
    user_id: number;
    card_bin?: string;
}

export interface ISaveCardSkyflowRequest {
    skyflow_id: string;
    subscription_id?: string;
}

/**
 * @deprecated Raw card fields are no longer accepted by `saveCustomerCard()`.
 * Use `mountCardFields()` to render Skyflow Elements in your form and call
 * `saveCustomerCard()` with no arguments.
 */
export interface ISaveCardRequest {
    card_number: string;
    cvv: string;
    expiration_month: string;
    expiration_year: string;
    cardholder_name: string;
}
export enum CardFieldEnum {
    CARD_NUMBER = 'card_number',
    CVV = 'cvv',
    EXPIRATION_MONTH = 'expiration_month',
    EXPIRATION_YEAR = 'expiration_year',
    CARDHOLDER_NAME = 'cardholder_name',
}
export type CardField = "cvv" | "card_number" | "expiration_month" | "expiration_year" | "cardholder_name";

/**
 * Configuration for mounting Skyflow Elements into developer-provided `<div>` containers.
 *
 * Used in two scenarios:
 * - **New card form** (no `card_id`): mount all 5 fields before calling `payment()` or
 *   `saveCustomerCard()`. Default container IDs are `#collect_<field>` (e.g. `#collect_card_number`).
 * - **Saved-card CVV** (with `card_id`): mount only `cvv` for a specific saved card before
 *   calling `payment()` with the card's skyflow_id. Default container ID is `#collect_cvv_<card_id>`.
 *
 * Custom container IDs can be set via the `{ field, container_id }` object form of each field entry.
 */
export interface IMountCardFieldsRequest {
    fields: (CardField | { container_id?: string; field: CardField })[];
    card_id?: string;
    unmount_context?: 'all' | 'current' | 'create' | string;
}

// ─── Reveal Elements ──────────────────────────────────────────────────────────

/**
 * Card fields that can be revealed via Skyflow Reveal Elements.
 *
 * `cvv` is intentionally excluded: PCI DSS Requirement 3.2.1 prohibits storing or
 * displaying the card verification value after authorisation.
 */
export type RevealableCardField = Exclude<CardField, 'cvv'>;

/**
 * Styles accepted by Skyflow Reveal Elements.
 * Note: Reveal elements only support `base`, `copyIcon`, and `global` style variants
 * (unlike Collect elements which also support `focus`, `complete`, `invalid`, etc.).
 */
export interface IRevealElementInputStyles {
    base?: Record<string, any>;
    copyIcon?: Record<string, any>;
    global?: Record<string, any>;
}

/** Full styles object for a Skyflow Reveal Element. */
export interface IRevealElementStyles {
    inputStyles?: IRevealElementInputStyles;
    labelStyles?: { base?: Record<string, any>; global?: Record<string, any> };
    errorTextStyles?: { base?: Record<string, any>; global?: Record<string, any> };
}

/**
 * Per-field reveal configuration.
 * When using the shorthand string form (e.g. `'card_number'`), defaults are applied automatically.
 *
 * Redaction levels are fixed by the SDK to comply with PCI DSS and cannot be overridden:
 * - `card_number`       → `MASKED`     (shows only first-6 / last-4 digits)
 * - `cardholder_name`   → `PLAIN_TEXT`
 * - `expiration_month`  → `PLAIN_TEXT`
 * - `expiration_year`   → `PLAIN_TEXT`
 */
export interface IRevealCardField {
    /** The card field to reveal. CVV is not allowed per PCI DSS req. 3.2.1. */
    field: RevealableCardField;
    /**
     * ID of the `<div>` container where the Reveal Element will be mounted.
     * Defaults to `#reveal_<field>` (e.g. `#reveal_card_number`).
     */
    container_id?: string;
    /**
     * Placeholder text shown inside the iframe before `reveal()` is called.
     * If not set, Skyflow shows the token string.
     */
    altText?: string;
    /** Label rendered by Skyflow above the element. */
    label?: string;
    /** Per-field styles. Overrides `IRevealCardFieldsRequest.styles` for this field. */
    styles?: IRevealElementStyles;
}

/**
 * Request object for `revealCardFields()`.
 *
 * Call `revealCardFields()` after a successful `saveCustomerCard()` or `payment()` that
 * processed a new card. The SDK stores the Skyflow tokens from the collect operation and
 * uses them to populate Skyflow Reveal Elements (secure iframes) in the provided `<div>` containers.
 *
 * Redaction is applied automatically per PCI DSS guidelines and cannot be configured.
 */
export interface IRevealCardFieldsRequest {
    /**
     * Fields to reveal. Each entry can be a plain `RevealableCardField` string (uses all defaults)
     * or an `IRevealCardField` object for custom container, label, altText or styles.
     * CVV is not a valid option.
     */
    fields: (RevealableCardField | IRevealCardField)[];
    /**
     * Global styles applied to all reveal elements.
     * Per-field `styles` in `IRevealCardField` takes priority over this.
     */
    styles?: IRevealElementStyles;
}
