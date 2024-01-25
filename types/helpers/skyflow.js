"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSkyflow = void 0;
const styles_1 = require("./styles");
const skyflow_js_1 = __importDefault(require("skyflow-js"));
function initSkyflow(vaultId, vaultUrl, baseUrl, signal, customStyles = {}, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const skyflow = yield skyflow_js_1.default.init({
            vaultID: vaultId,
            vaultURL: vaultUrl,
            getBearerToken: () => __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`${baseUrl}/api/v1/vault-token/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${apiKey}`,
                    },
                    signal: signal,
                });
                if (response.ok) {
                    const responseBody = yield response.json();
                    return responseBody.token;
                }
                else {
                    throw new Error('Failed to retrieve bearer token');
                }
            }),
            options: {
                logLevel: skyflow_js_1.default.LogLevel.ERROR,
                env: skyflow_js_1.default.Env.DEV,
            },
        });
        const collectContainer = yield skyflow.container(skyflow_js_1.default.ContainerType.COLLECT);
        var collectStylesOptions = Object.keys(customStyles).length === 0 ? styles_1.defaultStyles : customStyles;
        const stylesForCardNumber = Object.assign({}, collectStylesOptions.inputStyles.base);
        stylesForCardNumber.textIndent = '44px';
        const lengthMatchRule = {
            type: skyflow_js_1.default.ValidationRuleType.LENGTH_MATCH_RULE,
            params: {
                max: 70,
            },
        };
        const cardHolderNameElement = yield collectContainer.create(Object.assign(Object.assign({ table: "cards", column: "cardholder_name" }, collectStylesOptions), { label: "Titular de la tarjeta", placeholder: "Nombre como aparece en la tarjeta", type: skyflow_js_1.default.ElementType.CARDHOLDER_NAME, validations: [lengthMatchRule] }));
        cardHolderNameElement.setError('Inválido');
        const cardNumberElement = yield collectContainer.create(Object.assign(Object.assign({ table: "cards", column: "card_number" }, collectStylesOptions), { inputStyles: Object.assign(Object.assign({}, collectStylesOptions.inputStyles), { base: stylesForCardNumber }), label: "Número de tarjeta", placeholder: "1234 1234 1234 1234", type: skyflow_js_1.default.ElementType.CARD_NUMBER }));
        cardNumberElement.setError('Inválido');
        const cvvElement = yield collectContainer.create(Object.assign(Object.assign({ table: "cards", column: "cvv" }, collectStylesOptions), { label: "CVC/CVV", placeholder: "3-4 dígitos", type: skyflow_js_1.default.ElementType.CVV }));
        cvvElement.setError('Inválido');
        const expiryMonthElement = yield collectContainer.create(Object.assign(Object.assign({ table: "cards", column: "expiration_month" }, collectStylesOptions), { label: "Fecha de expiración", placeholder: "MM", type: skyflow_js_1.default.ElementType.EXPIRATION_MONTH }));
        expiryMonthElement.setError('Inválido');
        const expiryYearElement = yield collectContainer.create(Object.assign(Object.assign({ table: "cards", column: "expiration_year" }, collectStylesOptions), { label: "", placeholder: "AA", type: skyflow_js_1.default.ElementType.EXPIRATION_YEAR }));
        expiryYearElement.setError('Inválido');
        yield mountElements(cardNumberElement, cvvElement, expiryMonthElement, expiryYearElement, cardHolderNameElement);
        return collectContainer;
    });
}
exports.initSkyflow = initSkyflow;
function mountElements(cardNumberElement, cvvElement, expiryMonthElement, expiryYearElement, cardHolderNameElement) {
    return __awaiter(this, void 0, void 0, function* () {
        cardNumberElement.mount("#collectCardNumber");
        cvvElement.mount("#collectCvv");
        expiryMonthElement.mount("#collectExpirationMonth");
        expiryYearElement.mount("#collectExpirationYear");
        cardHolderNameElement.mount("#collectCardholderName");
    });
}
//# sourceMappingURL=skyflow.js.map