import Skyflow from "skyflow-js";
import CollectContainer from "skyflow-js/types/core/external/collect/collect-container";
import CollectElement from "skyflow-js/types/core/external/collect/collect-element";
import RevealContainer from "skyflow-js/types/core/external/reveal/reveal-container";
import { getVaultToken } from "../data/skyflowApi";
import { TokensSkyflowRequest } from "../types/requests";
import { CardFieldEnum, IMountCardFieldsRequest, IRevealCardField, IRevealCardFieldsRequest } from "../types/card";
import {
  IEvents,
  IInputEvents,
  ILiteCustomizationOptions,
  IStyles,
  StylesBaseVariant,
} from "../types/commons";
import {
  DEFAULT_SKYFLOW_lABELS,
  DEFAULT_SKYFLOW_PLACEHOLDERS,
  lengthMatchRule,
  regexMatchRule,
} from "../shared/constants/skyflow.contants";
import {
  DEFAULT_SKYFLOW_ERROR_TEXT_STYLES,
  DEFAULT_SKYFLOW_INPUT_STYLES,
  DEFAULT_SKYFLOW_lABEL_STYLES,
} from "../shared/styles/skyflow.styles";
import { get } from "lodash";
import { buildPublicAppError } from "../shared/utils/appError";
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum";

/**
 * @deprecated This function is deprecated and will be removed in a future release.
 * Use `mountCardFields()` to render Skyflow Elements and collect card data securely.
 */
export async function getSkyflowTokens({
  baseUrl,
  apiKey,
  vault_id,
  vault_url,
  data,
}: TokensSkyflowRequest): Promise<any> {
  const skyflow = Skyflow.init({
    vaultID: vault_id,
    vaultURL: vault_url,
    getBearerToken: async () => await getVaultToken(baseUrl, apiKey),
    options: {
      logLevel: Skyflow.LogLevel.ERROR,
      env: Skyflow.Env.DEV, // ⚠️ This should be Env.PROD, but currently it cannot be changed because getSkyflowTokens must be deprecated first, since .setValue does not work in PROD.
    },
  });

  const collectContainer: CollectContainer = skyflow.container(
    Skyflow.ContainerType.COLLECT,
  ) as CollectContainer;

  const fieldPromises = await getFieldsPromise(data, collectContainer);

  const result = await Promise.all(fieldPromises);

  const mountFail = result.some((item: boolean) => !item);

  if (mountFail) {
    throw buildPublicAppError({
      errorCode: ErrorKeyEnum.SAVE_CARD_PROCESS_ERROR,
      details: {
        step: "get_skyflow_tokens",
      },
    });
  } else {
    try {
      const collectResponseSkyflowTonder =
        (await collectContainer.collect()) as any;
      if (collectResponseSkyflowTonder)
        return collectResponseSkyflowTonder["records"][0]["fields"];
      throw buildPublicAppError({
        errorCode: ErrorKeyEnum.SAVE_CARD_PROCESS_ERROR,
        details: {
          step: "get_skyflow_tokens"
        },
      });
    } catch (error) {
      throw buildPublicAppError(
        {
          errorCode: ErrorKeyEnum.SAVE_CARD_PROCESS_ERROR,
        },
        error,
      );
    }
  }
}

async function getFieldsPromise(
  data: any,
  collectContainer: CollectContainer,
): Promise<Promise<boolean>[]> {
  const fields = await getFields(data, collectContainer);
  if (!fields) return [];

  return fields.map((field: { element: CollectElement; key: string }) => {
    return new Promise((resolve) => {
      const div = document.createElement("div");
      div.hidden = true;
      div.id = `id-${field.key}`;
      document.querySelector(`body`)?.appendChild(div);
      setTimeout(() => {
        field.element.mount(`#id-${field.key}`);
        setInterval(() => {
          if (field.element.isMounted()) {
            const value = data[field.key];
            field.element.setValue(value);
            return resolve(field.element.isMounted());
          }
        }, 120);
      }, 120);
    });
  });
}

async function getFields(
  data: any,
  collectContainer: CollectContainer,
): Promise<{ element: CollectElement; key: string }[]> {
  return await Promise.all(
    Object.keys(data).map(async (key) => {
      const cardHolderNameElement = await collectContainer.create({
        table: "cards",
        column: key,
        type: Skyflow.ElementType.INPUT_FIELD,
      });
      return { element: cardHolderNameElement, key: key };
    }),
  );
}

export async function initSkyflowInstance({
  baseUrl,
  apiKey,
  vault_id,
  vault_url,
  mode,
}: TokensSkyflowRequest): Promise<Skyflow> {
  const skyflowEnv = mode === 'production' ? Skyflow.Env.PROD : Skyflow.Env.DEV;
  return Skyflow.init({
    vaultID: vault_id,
    vaultURL: vault_url,
    getBearerToken: async () => await getVaultToken(baseUrl, apiKey),
    options: {
      logLevel: Skyflow.LogLevel.ERROR,
      env: skyflowEnv,
    },
  });
}

export async function mountSkyflowFields(event: {
  skyflowInstance: Skyflow;
  data: IMountCardFieldsRequest;
  customization?: ILiteCustomizationOptions;
  events?: IEvents;
}): Promise<{ elements: CollectElement[]; container: CollectContainer }> {
  const { skyflowInstance, data, customization, events } = event;
  const collectContainer: CollectContainer = skyflowInstance.container(
    Skyflow.ContainerType.COLLECT,
  ) as CollectContainer;
  const elements: { element: CollectElement; containerId: string }[] = [];
  const typeByField: Record<
    CardFieldEnum,
    (typeof Skyflow.ElementType)[keyof typeof Skyflow.ElementType]
  > = {
    [CardFieldEnum.CVV]: Skyflow.ElementType.CVV,
    [CardFieldEnum.CARD_NUMBER]: Skyflow.ElementType.CARD_NUMBER,
    [CardFieldEnum.EXPIRATION_MONTH]: Skyflow.ElementType.EXPIRATION_MONTH,
    [CardFieldEnum.EXPIRATION_YEAR]: Skyflow.ElementType.EXPIRATION_YEAR,
    [CardFieldEnum.CARDHOLDER_NAME]: Skyflow.ElementType.CARDHOLDER_NAME,
  };

  const validationsByField = {
    [CardFieldEnum.CVV]: [regexMatchRule],
    [CardFieldEnum.CARD_NUMBER]: [regexMatchRule],
    [CardFieldEnum.EXPIRATION_MONTH]: [regexMatchRule],
    [CardFieldEnum.EXPIRATION_YEAR]: [regexMatchRule],
    [CardFieldEnum.CARDHOLDER_NAME]: [lengthMatchRule, regexMatchRule],
  };
  const fieldToStyleKey: Record<CardFieldEnum, keyof Omit<IStyles, 'cardForm' | 'enableCardIcon'>> = {
    [CardFieldEnum.CARDHOLDER_NAME]: 'cardholderName',
    [CardFieldEnum.CARD_NUMBER]: 'cardNumber',
    [CardFieldEnum.CVV]: 'cvv',
    [CardFieldEnum.EXPIRATION_MONTH]: 'expirationMonth',
    [CardFieldEnum.EXPIRATION_YEAR]: 'expirationYear',
  };

  const getFieldStyles = (field: CardFieldEnum) => {
    const perField = customization?.styles?.[fieldToStyleKey[field]];
    const form = customization?.styles?.cardForm;
    const resolvedInputStyles = perField?.inputStyles ?? form?.inputStyles ?? DEFAULT_SKYFLOW_INPUT_STYLES;

    // For card_number: inject paddingLeft default so text doesn't overlap the card-network icon.
    // Applied only when the icon is visible (enableCardIcon !== false) and the developer
    // hasn't already set paddingLeft in their base styles.
    const iconVisible = field === CardFieldEnum.CARD_NUMBER && customization?.styles?.enableCardIcon !== false;
    const inputStyles = iconVisible
      ? {
          ...resolvedInputStyles,
          base: {
            paddingLeft: '15px',             // default — gives room for the card icon
            ...(resolvedInputStyles as any)?.base, // developer's base overrides, including their own paddingLeft
          },
        }
      : resolvedInputStyles;

    return {
      inputStyles,
      labelStyles: perField?.labelStyles ?? form?.labelStyles ?? DEFAULT_SKYFLOW_lABEL_STYLES,
      errorStyles: perField?.errorStyles ?? form?.errorStyles ?? DEFAULT_SKYFLOW_ERROR_TEXT_STYLES,
    };
  };

  const labels: Record<string, string> = {
    cardholder_name: customization?.labels?.name || DEFAULT_SKYFLOW_lABELS.name,
    card_number:
      customization?.labels?.card_number || DEFAULT_SKYFLOW_lABELS.card_number,
    cvv: customization?.labels?.cvv || DEFAULT_SKYFLOW_lABELS.cvv,
    expiration_date:
      customization?.labels?.expiry_date ||
      DEFAULT_SKYFLOW_lABELS.expiration_date,
    expiration_month:
      customization?.labels?.expiration_month ||
      DEFAULT_SKYFLOW_lABELS.expiration_month,
    expiration_year:
      customization?.labels?.expiration_year ||
      DEFAULT_SKYFLOW_lABELS.expiration_year,
  };
  const placeholders: Record<string, string> = {
    cardholder_name:
      customization?.placeholders?.name || DEFAULT_SKYFLOW_PLACEHOLDERS.name,
    card_number:
      customization?.placeholders?.card_number ||
      DEFAULT_SKYFLOW_PLACEHOLDERS.card_number,
    cvv: customization?.placeholders?.cvv || DEFAULT_SKYFLOW_PLACEHOLDERS.cvv,
    expiration_month:
      customization?.placeholders?.expiration_month ||
      DEFAULT_SKYFLOW_PLACEHOLDERS.expiration_month,
    expiration_year:
      customization?.placeholders?.expiration_year ||
      DEFAULT_SKYFLOW_PLACEHOLDERS.expiration_year,
  };
  const eventsByField: Record<CardFieldEnum, IInputEvents | undefined> = {
    [CardFieldEnum.CVV]: events?.cvvEvents,
    [CardFieldEnum.CARD_NUMBER]: events?.cardNumberEvents,
    [CardFieldEnum.EXPIRATION_MONTH]: events?.monthEvents,
    [CardFieldEnum.EXPIRATION_YEAR]: events?.yearEvents,
    [CardFieldEnum.CARDHOLDER_NAME]: events?.cardHolderEvents,
  };

  if ("fields" in data && Array.isArray(data.fields)) {
    const cardIconOption = { enableCardIcon: customization?.styles?.enableCardIcon ?? true };

    if (data.fields.length > 0 && typeof data.fields[0] === "string") {
      for (const field of data.fields as CardFieldEnum[]) {
        const element = collectContainer.create(
          {
            table: "cards",
            column: field,
            type: typeByField[field],
            validations: validationsByField[field],
            ...getFieldStyles(field),
            label: labels[field],
            placeholder: placeholders[field],
            ...(data.card_id ? { skyflowID: data.card_id } : {}),
          },
          field === CardFieldEnum.CARD_NUMBER ? cardIconOption : undefined,
        );
        handleSkyflowElementEvents({
          element,
          errorStyles: getFieldStyles(field).errorStyles,
          fieldMessage: [
            CardFieldEnum.CVV,
            CardFieldEnum.EXPIRATION_MONTH,
            CardFieldEnum.EXPIRATION_YEAR,
          ].includes(field)
            ? ""
            : labels[field],
          events: eventsByField[field],
        });
        const containerId =
          `#collect_${String(field)}` +
          (data.card_id ? `_${data.card_id}` : "");
        await tryMountElement({element, containerId});
        elements.push({ element, containerId });
      }
    } else {
      for (const fieldObj of data.fields as {
        container_id?: string;
        field: CardFieldEnum;
      }[]) {
        const key = fieldObj.field;
        const element = collectContainer.create(
          {
            table: "cards",
            column: key,
            type: typeByField[key],
            validations: validationsByField[key],
            ...getFieldStyles(key),
            label: labels[key],
            placeholder: placeholders[key],
            ...(data.card_id ? { skyflowID: data.card_id } : {}),
          },
          key === CardFieldEnum.CARD_NUMBER ? cardIconOption : undefined,
        );
        const containerId =
          fieldObj.container_id ||
          `#collect_${String(key)}` + (data.card_id ? `_${data.card_id}` : "");
        await tryMountElement({element, containerId});
        elements.push({ element, containerId });
      }
    }
  }

  return {
    elements: elements.map((e) => e.element),
    container: collectContainer,
  };
}

function handleSkyflowElementEvents(event: {
  element: CollectElement;
  fieldMessage?: string;
  errorStyles?: StylesBaseVariant;
  requiredMessage?: string;
  invalidMessage?: string;
  events?: IInputEvents;
}) {
  const {
    element,
    fieldMessage = "",
    errorStyles = {},
    requiredMessage = "Campo requerido",
    invalidMessage = "Campo no válido",
    events,
  } = event;
  if ("on" in element) {
    element.on(Skyflow.EventName.CHANGE, (state: any) => {
      executeEvent({ eventName: "onChange", data: state, events });
      updateErrorLabel({
        element,
        errorStyles,
        color: "transparent",
      });
    });

    element.on(Skyflow.EventName.BLUR, (state: any) => {
      executeEvent({ eventName: "onBlur", data: state, events });
      if (!state.isValid) {
        const msj_error = state.isEmpty
          ? requiredMessage
          : fieldMessage != ""
            ? `El campo ${fieldMessage} no es válido`
            : invalidMessage;
        element.setError(msj_error);
      }
      updateErrorLabel({
        element,
        errorStyles,
      });
    });

    element.on(Skyflow.EventName.FOCUS, (state: any) => {
      executeEvent({ eventName: "onFocus", data: state, events });
      updateErrorLabel({
        element,
        errorStyles,
        color: "transparent",
      });
      element.resetError();
    });
  }
}

function updateErrorLabel(event: {
  element: CollectElement;
  errorStyles?: StylesBaseVariant;
  color?: string;
}) {
  const { element, errorStyles = {}, color = "" } = event;
  if (Object.keys(errorStyles).length > 0) {
    element.update({
      errorTextStyles: {
        ...errorStyles,
        base: {
          // @ts-ignore
          ...(errorStyles.base && { ...errorStyles.base }),
          ...(color != "" && { color }),
        },
      },
    });
  }
}

const executeEvent = (event: {
  eventName: "onChange" | "onBlur" | "onFocus";
  data: any;
  events?: IInputEvents;
}) => {
  const { eventName, data, events } = event;
  if (events && eventName in events) {
    const eventHandler = events[eventName];
    if (typeof eventHandler === "function") {
      eventHandler({
        elementType: get(data, "elementType", ""),
        isEmpty: get(data, "isEmpty", false),
        isFocused: get(data, "isFocused", false),
        isValid: get(data, "isValid", false),
        value: get(data, "value", ""),
      });
    }
  }
};

export async function mountRevealFields(event: {
  skyflowInstance: Skyflow;
  tokens: Record<string, string>;
  request: IRevealCardFieldsRequest;
}): Promise<void> {
  const { skyflowInstance, tokens, request } = event;
  const revealContainer = skyflowInstance.container(
    Skyflow.ContainerType.REVEAL,
  ) as RevealContainer;

  // Redaction levels are fixed per PCI DSS — not configurable by the caller.
  // CVV (PCI DSS req. 3.2.1) must never be revealed after authorisation.
  const pciRedaction: Partial<Record<CardFieldEnum, string>> = {
    [CardFieldEnum.CARD_NUMBER]:      'MASKED',      // first-6 / last-4 only
    [CardFieldEnum.CARDHOLDER_NAME]:  'PLAIN_TEXT',
    [CardFieldEnum.EXPIRATION_MONTH]: 'PLAIN_TEXT',
    [CardFieldEnum.EXPIRATION_YEAR]:  'PLAIN_TEXT',
  };

  for (const entry of request.fields) {
    const isString = typeof entry === 'string';
    const field = (isString ? entry : (entry as IRevealCardField).field) as CardFieldEnum;

    // CVV must never be revealed — skip silently with a warning.
    if (field === CardFieldEnum.CVV) {
      console.warn('[revealCardFields] CVV cannot be revealed (PCI DSS req. 3.2.1). Skipping.');
      continue;
    }

    const token = tokens[field];
    if (!token) {
      console.warn(`[revealCardFields] No token found for field "${field}", skipping.`);
      continue;
    }

    const cfg: Partial<IRevealCardField> = isString ? {} : (entry as IRevealCardField);
    const containerId = cfg.container_id ?? `#reveal_${field}`;
    const redactionKey = pciRedaction[field]!;
    const fieldStyles = cfg.styles ?? {};
    const globalStyles = request.styles ?? {};

    const element = revealContainer.create({
      token,
      redaction: Skyflow.RedactionType[redactionKey as keyof typeof Skyflow.RedactionType], // fixed by SDK
      ...(cfg.altText !== undefined && { altText: cfg.altText }),
      ...(cfg.label !== undefined && { label: cfg.label }),
      ...(fieldStyles.inputStyles || globalStyles.inputStyles
        ? { inputStyles: fieldStyles.inputStyles ?? globalStyles.inputStyles }
        : {}),
      ...(fieldStyles.labelStyles || globalStyles.labelStyles
        ? { labelStyles: fieldStyles.labelStyles ?? globalStyles.labelStyles }
        : {}),
      ...(fieldStyles.errorTextStyles || globalStyles.errorTextStyles
        ? { errorTextStyles: fieldStyles.errorTextStyles ?? globalStyles.errorTextStyles }
        : {}),
    });

    await tryMountElement({ element, containerId });
  }

  try {
    await (revealContainer as any).reveal();
  } catch (e) {
    // reveal() returns partial success/error — not critical to throw
    console.warn('[revealCardFields] reveal completed with errors:', e);
  }
}

async function tryMountElement(event: {
  element: any;
  containerId: string;
  retries?: number;
  delay?: number;
}): Promise<void> {
  const { element, containerId, retries = 2, delay = 30 } = event;
  for (let i = 0; i <= retries; i++) {
    const el = document.querySelector(containerId);
    if (el) {
      element.mount(containerId);
      return;
    }
    if (i < retries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.warn(
    `[mountCardFields] Container ${containerId} was not found after ${retries + 1} attempts`,
  );
}
