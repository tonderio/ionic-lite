import type {
  AcquirerInstance,
  CardOnFileSubscriptionRequest,
  CardOnFileSubscriptionResponse,
  CardOnFileTokenRequest,
  CardOnFileTokenResponse,
  ProcessParams,
  SecureInitResponse,
  SecurityInfo,
  Validate3DSResponse,
} from "../types/cardOnFile";

declare global {
  interface Window {
    // External acquirer SDK (Kushki)
    Kushki: new (config: { merchantId: string; inTestEnvironment: boolean }) => AcquirerInstance;
  }
}

// ============ Helper Functions ============

const ACQUIRER_SCRIPT_URL = "https://cdn.kushkipagos.com/kushki.min.js";

let acquirerScriptLoaded = false;
let acquirerScriptPromise: Promise<void> | null = null;

async function loadAcquirerScript(): Promise<void> {
  if (acquirerScriptLoaded) {
    return Promise.resolve();
  }

  if (acquirerScriptPromise) {
    return acquirerScriptPromise;
  }

  acquirerScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${ACQUIRER_SCRIPT_URL}"]`);

    if (existingScript) {
      acquirerScriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = ACQUIRER_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      acquirerScriptLoaded = true;
      resolve();
    };

    script.onerror = () => {
      acquirerScriptPromise = null;
      reject(new Error("Failed to load acquirer script"));
    };

    document.head.appendChild(script);
  });

  return acquirerScriptPromise;
}

function createAcquirerInstance(
  merchantId: string,
  isTestEnvironment: boolean
): AcquirerInstance {
  if (!window.Kushki) {
    throw new Error("Acquirer script not loaded. Call initialize() first.");
  }

  return new window.Kushki({
    merchantId,
    inTestEnvironment: isTestEnvironment,
  });
}

// ============ Constants ============

const ACQ_API_URL_STAGE = "https://api-stage.tonder.io";
const ACQ_API_URL_PROD = "https://api.tonder.io";

// ============ CardOnFile Class ============

export class CardOnFile {
  private readonly apiUrl: string;
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly isTestEnvironment: boolean;
  private acquirerInstance: AcquirerInstance | null = null;

  constructor(config: {
    merchantId: string;
    apiKey: string;
    isTestEnvironment?: boolean;
  }) {
    this.isTestEnvironment = config.isTestEnvironment ?? true;
    this.apiUrl = this.isTestEnvironment ? ACQ_API_URL_STAGE : ACQ_API_URL_PROD;
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    await loadAcquirerScript();
    this.acquirerInstance = createAcquirerInstance(
      this.merchantId,
      this.isTestEnvironment
    );
  }

  private getAcquirerInstance(): AcquirerInstance {
    if (!this.acquirerInstance) {
      throw new Error("CardOnFile not initialized. Call initialize() first.");
    }
    return this.acquirerInstance;
  }

  /**
   * Get JWT for 3DS authentication
   * @param cardBin - First 8 digits of the card number
   */
  async getJwt(cardBin: string): Promise<string> {
    const acquirer = this.getAcquirerInstance();

    return new Promise<string>((resolve, reject) => {
      acquirer.requestSecureInit(
        {
          card: {
            number: cardBin,
          },
        },
        (response) => {
          if ("code" in response && response.code) {
            reject(new Error(`Error getting JWT: ${response.message}`));
            return;
          }

          const successResponse = response as SecureInitResponse;
          if (!successResponse.jwt) {
            reject(new Error("No JWT returned from acquirer"));
            return;
          }

          resolve(successResponse.jwt);
        }
      );
    });
  }

  /**
   * Generate a recurring charge token
   */
  async generateToken(request: CardOnFileTokenRequest): Promise<CardOnFileTokenResponse> {
    const response = await fetch(
      `${this.apiUrl}/acq-kushki/subscription/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate token: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<CardOnFileTokenResponse>;
  }

  /**
   * Create a subscription with the generated token
   */
  async createSubscription(request: CardOnFileSubscriptionRequest): Promise<CardOnFileSubscriptionResponse> {
    const response = await fetch(
      `${this.apiUrl}/acq-kushki/subscription/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create subscription: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<CardOnFileSubscriptionResponse>;
  }

  /**
   * Validate 3DS challenge
   * @returns true if validation passed, throws error otherwise
   */
  async validate3DS(
    secureId: string,
    security: SecurityInfo
  ): Promise<boolean> {
    const acquirer = this.getAcquirerInstance();

    return new Promise<boolean>((resolve, reject) => {
      acquirer.requestValidate3DS(
        {
          secureId,
          security,
        },
        (response) => {
          const validResponse = response as Validate3DSResponse;
          // Check for error code
          if (validResponse.code && validResponse.code !== "3DS000") {
            reject(new Error(`3DS validation failed}`));
            return;
          }

          // Check isValid flag if present
          if (validResponse.isValid === false) {
            reject(new Error("3DS validation failed"));
            return;
          }

          resolve(true);
        }
      );
    });
  }

  /**
   * Complete flow: JWT → Token → 3DS validation → Subscription
   */
  async process(params: ProcessParams): Promise<CardOnFileSubscriptionResponse> {
    const jwt = await this.getJwt(params.cardBin);
    const tokenResponse = await this.generateToken({
      card: params.cardTokens,
      currency: params.currency,
      jwt,
    });
    // Handle both response structures: root level or nested in details
    const secureId = tokenResponse.secureId || tokenResponse.details?.secureId;
    const security = tokenResponse.security || tokenResponse.details?.security;

    // Validate 3DS is required
    if (!secureId || !security) {
      throw new Error("Missing secureId or security in token response");
    }

    // Validate 3DS - throws error if validation fails
    await this.validate3DS(secureId, security);

    // Only continue to subscription if 3DS validation passed
    return this.createSubscription({
      token: tokenResponse.token,
      contactDetails: params.contactDetails,
      metadata: {
        customerId: params.customerId,
      },
      currency: params.currency,
    });
  }
}
