import Skyflow from "skyflow-js";

const lengthMatchRule = {
    type: Skyflow.ValidationRuleType.LENGTH_MATCH_RULE,
    params: {
        max: 70,
    },
};
const regexEmpty = RegExp('^(?!s*$).+');

const regexMatchRule = {
    type: Skyflow.ValidationRuleType.REGEX_MATCH_RULE,
    params: {
        regex: regexEmpty,
        error: 'El campo es requerido', // Optional, default error is 'VALIDATION FAILED'.
    },
};



const getErrorField = (
    event: {
        elementType?: string;
        isEmpty?: boolean;
        isFocused?: boolean;
        isValid?: boolean;
        value?: string;
    },
    field: string
) => {
    if (event.isEmpty) {
        return 'El campo es requerido';
    } else if (!event.isValid && !event.isEmpty) {
        return `El campo ${field} es inválido`;
    } else {
        return '';
    }
};

const DEFAULT_SKYFLOW_lABELS = {
    name: 'Titular de la tarjeta',
    card_number: 'Número de tarjeta',
    cvv: 'CVC/CVV',
    expiration_month: 'Mes',
    expiration_year: 'Año',
    expiration_date: 'Fecha de expiración',
};

const DEFAULT_SKYFLOW_PLACEHOLDERS = {
    name: 'Nombre como aparece en la tarjeta',
    card_number: '1234 1234 1234 1234',
    cvv: '3-4 dígitos',
    expiration_month: 'MM',
    expiration_year: 'AA',
};

export {
    lengthMatchRule,
    regexMatchRule,
    getErrorField,
    DEFAULT_SKYFLOW_lABELS,
    DEFAULT_SKYFLOW_PLACEHOLDERS,
};
