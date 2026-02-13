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
import { getApiBaseUrl, API_ENDPOINTS } from "../shared/constants/apiEndpoints";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";
import {
  buildPublicAppError,
} from "../shared/utils/appError";

declare global {
  interface Window {
    // External acquirer SDK (Kushki)
    Kushki: new (config: { merchantId: string; inTestEnvironment: boolean }) => AcquirerInstance;
  }
}

// ============ Helper Functions ============

const ACQUIRER_SCRIPT_URL = "https://cdn.kushkipagos.com/kushki.min.js";
const CARD_ON_FILE_ERROR_CODE = ErrorKeyEnum.CARD_ON_FILE_DECLINED;

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
      reject(
        buildPublicAppError({
          errorCode: CARD_ON_FILE_ERROR_CODE,
          lockErrorCode: true,
          details: {
            step: "load_acquirer_script",
            message: "Failed to load acquirer script",
          },
        }),
      );
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
    throw buildPublicAppError({
      errorCode: CARD_ON_FILE_ERROR_CODE,
      lockErrorCode: true,
      details: {
        step: "create_acquirer_instance",
        message: "Acquirer script not loaded. Call initialize() first.",
      },
    });
  }

  return new window.Kushki({
    merchantId,
    inTestEnvironment: isTestEnvironment,
  });
}

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
    // Use centralized API endpoint constants
    const mode = this.isTestEnvironment ? "stage" : "production";
    this.apiUrl = getApiBaseUrl(mode);
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
      throw buildPublicAppError({
        errorCode: CARD_ON_FILE_ERROR_CODE,
        lockErrorCode: true,
        details: {
          step: "get_acquirer_instance",
          message: "CardOnFile not initialized. Call initialize() first.",
        },
      });
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
            reject(
              buildPublicAppError({
                errorCode: CARD_ON_FILE_ERROR_CODE,
                lockErrorCode: true,
                details: {
                  step: "get_jwt",
                  acquirerResponse: response as unknown as Record<string, unknown>,
                },
              }),
            );
            return;
          }

          const successResponse = response as SecureInitResponse;
          if (!successResponse.jwt) {
            reject(
              buildPublicAppError({
                errorCode: CARD_ON_FILE_ERROR_CODE,
                lockErrorCode: true,
                details: {
                  step: "get_jwt",
                  message: "No JWT returned from acquirer",
                  acquirerResponse: successResponse as unknown as Record<string, unknown>,
                },
              }),
            );
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
      `${this.apiUrl}${API_ENDPOINTS.ACQ_SUBSCRIPTION_TOKEN}`,
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
      throw await buildPublicAppError({
        response,
        errorCode: CARD_ON_FILE_ERROR_CODE,
        lockErrorCode: true,
        details: {
          step: "generate_token",
        },
      });
    }

    return response.json() as Promise<CardOnFileTokenResponse>;
  }

  /**
   * Create a subscription with the generated token
   */
  async createSubscription(request: CardOnFileSubscriptionRequest): Promise<CardOnFileSubscriptionResponse> {
    const response = await fetch(
      `${this.apiUrl}${API_ENDPOINTS.ACQ_SUBSCRIPTION_CREATE}`,
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
      throw await buildPublicAppError({
        response,
        errorCode: CARD_ON_FILE_ERROR_CODE,
        lockErrorCode: true,
        details: {
          step: "create_subscription",
        },
      });
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
            reject(
              buildPublicAppError({
                errorCode: CARD_ON_FILE_ERROR_CODE,
                lockErrorCode: true,
                details: {
                  step: "validate_3ds",
                  message: "3DS validation failed",
                  acquirerResponse: validResponse as unknown as Record<string, unknown>,
                },
              }),
            );
            return;
          }

          // Check isValid flag if present
          if (validResponse.isValid === false) {
            reject(
              buildPublicAppError({
                errorCode: CARD_ON_FILE_ERROR_CODE,
                lockErrorCode: true,
                details: {
                  step: "validate_3ds",
                  message: "3DS validation failed",
                  acquirerResponse: validResponse as unknown as Record<string, unknown>,
                },
              }),
            );
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
      throw buildPublicAppError({
        errorCode: CARD_ON_FILE_ERROR_CODE,
        lockErrorCode: true,
        details: {
          step: "process",
          message: "Missing secureId or security in token response",
          tokenResponse: tokenResponse as unknown as Record<string, unknown>,
        },
      });
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
