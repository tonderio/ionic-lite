jest.setMock("skyflow-js", {
    OpenPay: jest.fn(),
    init: jest.fn().mockImplementation(() => ({
        container: () => ({
            collect: () => ({
                records: [{ fields: "1234" }],
            }),
        }),
    })),
    LogLevel: { ERROR: "ERROR" },
    Env: { DEV: "DEV" },
    ContainerType: { COLLECT: "COLLECT" },
});

const abortSignal = new AbortController().signal;

export const constructorFields = {
    signal: abortSignal,
    baseUrl: "",
    apiKey: "",
    returnUrl: ""
};