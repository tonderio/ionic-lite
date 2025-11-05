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
}

export interface ICustomerCardsResponse {
    user_id: number;
    cards: ICard[];
}

export interface ISaveCardResponse {
    skyflow_id: string;
    user_id: number;
}

export interface ISaveCardSkyflowRequest {
    skyflow_id: string;
}

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

export interface IMountCardFieldsRequest {
    fields: (CardField | { container_id?: string; field: CardField })[],
    card_id?: string;
}
