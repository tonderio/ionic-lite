import { ErrorResponse } from "../classes/errorResponse";
import { IErrorResponse } from "../types/responses";
import { PAYMENT_METHOD } from "./constants";

export const getBrowserInfo = () => {
  const browserInfo = {
    javascript_enabled: true,  // Assumed since JavaScript is running
    time_zone: new Date().getTimezoneOffset(),
    language: navigator.language || 'en-US', // Fallback to 'en-US'
    color_depth: window.screen ? window.screen.colorDepth : null,
    screen_width: window.screen ? window.screen.width * window.devicePixelRatio || window.screen.width : null,
    screen_height: window.screen ? window.screen.height * window.devicePixelRatio || window.screen.height : null,
    user_agent: navigator.userAgent,
  };
  return browserInfo;
}

const buildErrorResponseFromCatch = (e: any): ErrorResponse => {

  const error = new ErrorResponse({
    code: e?.status ? e.status : e.code,
    body: e?.body,
    name: e ? typeof e == "string" ? "catch" : (e as Error).name : "Error",
    message: e ? (typeof e == "string" ? e : (e as Error).message) : "Error",
    stack: typeof e == "string" ? undefined : (e as Error).stack,
  })

  return error;
}

const buildErrorResponse = async (
  response: Response,
  stack: string | undefined = undefined
): Promise<ErrorResponse> => {

  let body, status, message = "Error";

  if (response && "json" in response) {
    body = await response?.json();
  }

  if (response && "status" in response) {
    status = response.status.toString();
  }

  if (response && "text" in response) {
    message = await response.text();
  }

  const error = new ErrorResponse({
    code: status,
    body: body,
    name: status,
    message: message,
    stack,
  } as IErrorResponse)

  return error;
}

const getPaymentMethodDetails = (scheme_data: string): {icon: string; label: string} => {
  const scheme: PAYMENT_METHOD = clearSpace(scheme_data.toUpperCase()) as PAYMENT_METHOD;

  const PAYMENT_METHODS_CATALOG: Partial<Record<PAYMENT_METHOD, { icon: string, label: string }>> = {
    [PAYMENT_METHOD.SORIANA]: {
      label: "Soriana",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/soriana.png",
    },
    [PAYMENT_METHOD.OXXO]: {
      label: "Oxxo",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/oxxo.png",
    },
    [PAYMENT_METHOD.CODI]: {
      label: "CoDi",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/codi.png",
    },
    [PAYMENT_METHOD.SPEI]: {
      label: "SPEI",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/spei.png",
    },
    [PAYMENT_METHOD.PAYPAL]: {
      label: "Paypal",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/paypal.png",
    },
    [PAYMENT_METHOD.COMERCIALMEXICANA]: {
      label: "Comercial Mexicana",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/comercial_exicana.png",
    },
    [PAYMENT_METHOD.BANCOMER]: {
      label: "Bancomer",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/bancomer.png",
    },
    [PAYMENT_METHOD.WALMART]: {
      label: "Walmart",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/walmart.png",
    },
    [PAYMENT_METHOD.BODEGA]: {
      label: "Bodega Aurrera",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/bodega_aurrera.png",
    },
    [PAYMENT_METHOD.SAMSCLUB]: {
      label: "Sam´s Club",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/sams_club.png",
    },
    [PAYMENT_METHOD.SUPERAMA]: {
      label: "Superama",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/superama.png",
    },
    [PAYMENT_METHOD.CALIMAX]: {
      label: "Calimax",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/calimax.png",
    },
    [PAYMENT_METHOD.EXTRA]: {
      label: "Tiendas Extra",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/tiendas_extra.png",
    },
    [PAYMENT_METHOD.CIRCULOK]: {
      label: "Círculo K",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/circulo_k.png",
    },
    [PAYMENT_METHOD.SEVEN11]: {
      label: "7 Eleven",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/7_eleven.png",
    },
    [PAYMENT_METHOD.TELECOMM]: {
      label: "Telecomm",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/telecomm.png",
    },
    [PAYMENT_METHOD.BANORTE]: {
      label: "Banorte",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/banorte.png",
    },
    [PAYMENT_METHOD.BENAVIDES]: {
      label: "Farmacias Benavides",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_benavides.png",
    },
    [PAYMENT_METHOD.DELAHORRO]: {
      label: "Farmacias del Ahorro",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_ahorro.png",
    },
    [PAYMENT_METHOD.ELASTURIANO]: {
      label: "El Asturiano",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/asturiano.png",
    },
    [PAYMENT_METHOD.WALDOS]: {
      label: "Waldos",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/waldos.png",
    },
    [PAYMENT_METHOD.ALSUPER]: {
      label: "Alsuper",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/al_super.png",
    },
    [PAYMENT_METHOD.KIOSKO]: {
      label: "Kiosko",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/kiosko.png",
    },
    [PAYMENT_METHOD.STAMARIA]: {
      label: "Farmacias Santa María",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_santa_maria.png",
    },
    [PAYMENT_METHOD.LAMASBARATA]: {
      label: "Farmacias la más barata",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_barata.png",
    },
    [PAYMENT_METHOD.FARMROMA]: {
      label: "Farmacias Roma",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_roma.png",
    },
    [PAYMENT_METHOD.FARMUNION]: {
      label: "Pago en Farmacias Unión",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_union.png",
    },
    [PAYMENT_METHOD.FARMATODO]: {
      label: "Pago en Farmacias Farmatodo",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_farmatodo.png	",
    },
    [PAYMENT_METHOD.SFDEASIS]: {
      label: "Pago en Farmacias San Francisco de Asís",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/farmacias_san_francisco.png",
    },
    [PAYMENT_METHOD.FARM911]: {
      label: "Farmacias 911",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.FARMECONOMICAS]: {
      label: "Farmacias Economicas",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.FARMMEDICITY]: {
      label: "Farmacias Medicity",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.RIANXEIRA]: {
      label: "Rianxeira",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.WESTERNUNION]: {
      label: "Western Union",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.ZONAPAGO]: {
      label: "Zona Pago",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.CAJALOSANDES]: {
      label: "Caja Los Andes",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.CAJAPAITA]: {
      label: "Caja Paita",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.CAJASANTA]: {
      label: "Caja Santa",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.CAJASULLANA]: {
      label: "Caja Sullana",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.CAJATRUJILLO]: {
      label: "Caja Trujillo",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.EDPYME]: {
      label: "Edpyme",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.KASNET]: {
      label: "KasNet",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.NORANDINO]: {
      label: "Norandino",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.QAPAQ]: {
      label: "Qapaq",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.RAIZ]: {
      label: "Raiz",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.PAYSER]: {
      label: "Paysera",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.WUNION]: {
      label: "Western Union",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.BANCOCONTINENTAL]: {
      label: "Banco Continental",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.GMONEY]: {
      label: "Go money",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.GOPAY]: {
      label: "Go pay",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.WU]: {
      label: "Western Union",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.PUNTOSHEY]: {
      label: "Puntoshey",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.AMPM]: {
      label: "Ampm",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.JUMBOMARKET]: {
      label: "Jumbomarket",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.SMELPUEBLO]: {
      label: "Smelpueblo",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.BAM]: {
      label: "Bam",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.REFACIL]: {
      label: "Refacil",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
    [PAYMENT_METHOD.ACYVALORES]: {
      label: "Acyvalores",
      icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    },
  };

  const _default = {
    icon: "https://d35a75syrgujp0.cloudfront.net/payment_methods/store.png",
    label: ""
  };

  return PAYMENT_METHODS_CATALOG[scheme] || _default;
}

const clearSpace = (text: string) => {
  return text.trim().replace(/\s+/g, '');
}

export {
  buildErrorResponseFromCatch,
  buildErrorResponse,
  getPaymentMethodDetails
}