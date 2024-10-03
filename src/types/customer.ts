export type ICustomer = {
    /**
     * @deprecated This property is deprecated and will be removed in a future release.
     * Use `firstName` instead, as `name` is no longer required.
     */
    name?: string;
    /**
     * @deprecated This property is deprecated and will be removed in a future release.
     * Use `lastName` instead, as `lastname` is no longer required.
     */
    lastname?: string;
    firstName: string;
    lastName: string;
    country?: string;
    street?: string;
    city?: string;
    state?: string;
    postCode?: string;
    email: string;
    phone?: string;
    address?: string;
};
