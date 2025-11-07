import {ErrorKeyEnum} from "../enum/ErrorKeyEnum";

export const MESSAGES = Object.freeze({
    saveCardError: "Ha ocurrido un error guardando la tarjeta. Inténtalo nuevamente.",
    removeCardError: "Ha ocurrido un error eliminado la tarjeta. Inténtalo nuevamente.",
    getCardsError: "Ha ocurrido un error obteniendo las tarjetas del customer. Inténtalo nuevamente.",
    cardExist: "La tarjeta fue registrada previamente.",
    removedCard: "Card deleted successfully",
    errorCheckout: "No se ha podido procesar el pago",
    cardSaved: "Tarjeta registrada con éxito.",
    getPaymentMethodsError: "Ha ocurrido un error obteniendo las métodos de pago del customer. Inténtalo nuevamente.",
    getBusinessError: "Ha ocurrido un error obteniendo los datos del comercio. Inténtalo nuevamente.",
    secureTokenError: "Ha ocurrido un error obteniendo el token de seguridad.",
})


export const MESSAGES_EN: Record<string, string> = {
    [ErrorKeyEnum.INIT_ERROR]: 'Error initializing the SDK.',
    [ErrorKeyEnum.INVALID_TYPE]: 'SDK Type invalid.',
    [ErrorKeyEnum.STATE_ERROR]: 'Error updating SDK state.',
    [ErrorKeyEnum.FETCH_BUSINESS_ERROR]: 'Error retrieving merchant information.',
    [ErrorKeyEnum.INVALID_CONFIG]: 'Required configuration options.',
    [ErrorKeyEnum.MERCHANT_CREDENTIAL_REQUIRED]: 'Merchant credential required.',
    [ErrorKeyEnum.INVALID_PAYMENT_REQUEST]:
        'The payment data must be of type: :::interface:::.',
    [ErrorKeyEnum.INVALID_PAYMENT_REQUEST_CARD_PM]:
        'The fields card and payment_method cannot be provided together.',
    [ErrorKeyEnum.TYPE_SDK_REQUIRED]: 'SDK type required.',
    [ErrorKeyEnum.ENVIRONMENT_REQUIRED]: 'Environment required.',
    [ErrorKeyEnum.FETCH_CARDS_ERROR]: 'Error retrieving cards.',
    [ErrorKeyEnum.CUSTOMER_AUTH_TOKEN_NOT_VALID]:
        "The customer's auth token is invalid. Please verify that the customer's data was provided when creating the SDK (sdk.create) and try again.",
    [ErrorKeyEnum.SAVE_CARD_ERROR]: 'Error saving the card.',
    [ErrorKeyEnum.REMOVE_CARD_ERROR]: 'Error deleting the card.',
    [ErrorKeyEnum.CREATE_PAYMENT_ERROR]: 'Error creating the payment.',
    [ErrorKeyEnum.PAYMENT_PROCESS_ERROR]:
        'There was an issue processing the payment.',
    [ErrorKeyEnum.CARD_SAVED_SUCCESSFULLY]: 'Card saved successfully.',
    [ErrorKeyEnum.CARD_REMOVED_SUCCESSFULLY]: 'Card deleted successfully.',
    [ErrorKeyEnum.SAVE_CARD_PROCESS_ERROR]: 'Error processing card data.',
    [ErrorKeyEnum.START_CHECKOUT_ERROR]: 'Error processing the payment.',
    [ErrorKeyEnum.CREATE_ORDER_ERROR]: 'Error creating the order.',
    [ErrorKeyEnum.BUSINESS_ID_REQUIRED]: 'Business ID is required.',
    [ErrorKeyEnum.CLIENT_ID_REQUIRED]: 'Client ID is required.',
    [ErrorKeyEnum.INVALID_AMOUNT]: 'Invalid amount.',
    [ErrorKeyEnum.INVALID_ITEMS]: 'Invalid items.',
    [ErrorKeyEnum.CUSTOMER_OPERATION_ERROR]:
        'Error registering or fetching customer',
    [ErrorKeyEnum.INVALID_EMAIL]: 'Invalid email.',
    [ErrorKeyEnum.FETCH_PAYMENT_METHODS_ERROR]:
        'Error retrieving active payment methods.',
    [ErrorKeyEnum.INVALID_VAULT_TOKEN]:
        'An invalid vault token response was received.',
    [ErrorKeyEnum.VAULT_TOKEN_ERROR]: 'Error retrieving the vault token.',
    [ErrorKeyEnum.SECURE_TOKEN_ERROR]: 'Error getting secure token.',
    [ErrorKeyEnum.SECURE_TOKEN_INVALID]: 'Invalid secure token.',
    [ErrorKeyEnum.INVALID_SECRET_API_KEY]: 'SECRET API KEY is required.',
    [ErrorKeyEnum.REMOVE_CARD]: 'Card deleted successfully',
    [ErrorKeyEnum.SKYFLOW_NOT_INITIALIZED]: 'Skyflow not initialized.',
    [ErrorKeyEnum.ERROR_LOAD_PAYMENT_FORM]:
        'There was an issue loading the payment form.',
    [ErrorKeyEnum.INVALID_CARD_DATA]: 'Invalid card data.',
    [ErrorKeyEnum.ERROR_LOAD_ENROLLMENT_FORM]:
        'There was an issue loading the card form.',
    [ErrorKeyEnum.MOUNT_COLLECT_ERROR]:
        'Mount failed. Make sure all inputs are complete and valid.',
    [ErrorKeyEnum.REQUEST_ABORTED]: 'Requests canceled.',
    [ErrorKeyEnum.REQUEST_FAILED]: 'Request failed.',
    [ErrorKeyEnum.UNKNOWN_ERROR]: 'An unexpected error occurred.',
    [ErrorKeyEnum.CREATE_ERROR]: 'Error creating the SDK.',
    [ErrorKeyEnum.FETCH_TRANSACTION_ERROR]: 'Error retrieving the transaction.',
    [ErrorKeyEnum.THREEDS_REDIRECTION_ERROR]:
        'Ocurrió un error durante la redirección de 3DS.',
    [ErrorKeyEnum.REMOVE_SDK_ERROR]:
        'Ocurrió un error removiendo la instancia del SDK.',
};

export const MESSAGES_ES = {
    [ErrorKeyEnum.INIT_ERROR]: 'Error inicializando el SDK',
    [ErrorKeyEnum.STATE_ERROR]: 'Error actualizando el estado del SDK.',
    [ErrorKeyEnum.FETCH_BUSINESS_ERROR]:
        'Error obteniendo información del comercio',
    [ErrorKeyEnum.INVALID_CONFIG]: 'Opciones de configuración requeridas',
    [ErrorKeyEnum.TYPE_SDK_REQUIRED]: 'Tipo de SDK requerido',
    [ErrorKeyEnum.ENVIRONMENT_REQUIRED]: 'Ambiente requerido',
    [ErrorKeyEnum.FETCH_CARDS_ERROR]: 'Error obteniendo las tarjetas.',
    [ErrorKeyEnum.SAVE_CARD_ERROR]: 'Error guardando la tarjeta',
    [ErrorKeyEnum.REMOVE_CARD_ERROR]: 'Error eliminando la tarjeta.',
    [ErrorKeyEnum.CREATE_PAYMENT_ERROR]: 'Error creando el pago.',
    [ErrorKeyEnum.START_CHECKOUT_ERROR]: 'Error al procesar el pago.',
    [ErrorKeyEnum.CREATE_ORDER_ERROR]: 'Error creando la orden.',
    [ErrorKeyEnum.BUSINESS_ID_REQUIRED]: 'ID de Comercio es requerido',
    [ErrorKeyEnum.CLIENT_ID_REQUIRED]: 'ID de Cliente es requerido.',
    [ErrorKeyEnum.INVALID_AMOUNT]: 'Monto no válido.',
    [ErrorKeyEnum.INVALID_ITEMS]: 'Artículos no válidos.',
    [ErrorKeyEnum.CUSTOMER_OPERATION_ERROR]:
        'Error registrando u obteniendo el cliente.',
    [ErrorKeyEnum.INVALID_EMAIL]: 'Correo electrónico no válido.',
    [ErrorKeyEnum.FETCH_PAYMENT_METHODS_ERROR]:
        'Error obteniendo los métodos de pago activos.',
    [ErrorKeyEnum.INVALID_VAULT_TOKEN]:
        'Se recibió una respuesta de token de bóveda no válida.',
    [ErrorKeyEnum.VAULT_TOKEN_ERROR]: 'Error al obtener el token de la bóveda.',
    [ErrorKeyEnum.SECURE_TOKEN_ERROR]: 'Error obteniendo el token seguro.',
    [ErrorKeyEnum.INVALID_SECRET_API_KEY]: 'SECRET API KEY es requerido.',
    [ErrorKeyEnum.CUSTOMER_AUTH_TOKEN_NOT_VALID]:
        'El token del cliente no es valido, por favor verifica que se haya proporcionado los datos del cliente al crear el sdk (sdk.create) e intenta nuevamente.',
    [ErrorKeyEnum.SECURE_TOKEN_INVALID]: 'Token de seguridad inválido.',
    [ErrorKeyEnum.REMOVE_CARD]: 'Tarjeta eliminada exitosamente.',
    [ErrorKeyEnum.SKYFLOW_NOT_INITIALIZED]: 'Skyflow no inicializado.',
    [ErrorKeyEnum.INVALID_TYPE]: 'Tipo de SDK inválido.',
    [ErrorKeyEnum.PAYMENT_PROCESS_ERROR]: 'Hubo un problema al procesar el pago.',
    [ErrorKeyEnum.INVALID_PAYMENT_REQUEST]:
        'Los datos de pago deben ser del tipo: :::interface:::}}.',
    [ErrorKeyEnum.INVALID_PAYMENT_REQUEST_CARD_PM]:
        'Los datos card y payment_method no se pueden proporcionar juntos.',
    [ErrorKeyEnum.SAVE_CARD_PROCESS_ERROR]:
        'Error procesando los datos de la tarjeta.',
    [ErrorKeyEnum.ERROR_LOAD_PAYMENT_FORM]:
        'Hubo un problema cargando el formulario de pago.',
    [ErrorKeyEnum.INVALID_CARD_DATA]: 'Datos de tarjeta no válidos.',
    [ErrorKeyEnum.ERROR_LOAD_ENROLLMENT_FORM]:
        'Hubo un problema cargando el formulario de tarjeta.',
    [ErrorKeyEnum.MOUNT_COLLECT_ERROR]:
        'Falló el montaje. Asegúrate de que todos los campos estén completos y sean válidos.',
    [ErrorKeyEnum.CARD_SAVED_SUCCESSFULLY]: 'Tarjeta registrada con éxito.',
    [ErrorKeyEnum.CARD_REMOVED_SUCCESSFULLY]: 'Tarjeta eliminada con éxito.',
    [ErrorKeyEnum.REQUEST_ABORTED]: 'Peticiones canceladas.',
    [ErrorKeyEnum.REQUEST_FAILED]: 'Petición fallida.',
    [ErrorKeyEnum.UNKNOWN_ERROR]: 'Ocurrió un error inesperado.',
    [ErrorKeyEnum.CREATE_ERROR]: 'Error creando el SDK.',
    [ErrorKeyEnum.FETCH_TRANSACTION_ERROR]: 'Error obteniendo la transacción',
    [ErrorKeyEnum.THREEDS_REDIRECTION_ERROR]:
        'An error occurred during the 3DS redirection.',
    [ErrorKeyEnum.REMOVE_SDK_ERROR]:
        'An error occurred while removing the SDK instance.',
};
