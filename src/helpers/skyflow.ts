import {ErrorResponse} from "../classes/errorResponse";
import Skyflow from "skyflow-js";
import CollectContainer from "skyflow-js/types/core/external/collect/collect-container";
import {buildErrorResponseFromCatch} from "./utils";
import CollectElement from "skyflow-js/types/core/external/collect/collect-element";
import {getVaultToken} from "../data/skyflowApi";
import {TokensSkyflowRequest} from "../types/requests";

export async function getSkyflowTokens({
  baseUrl,
  apiKey,
  vault_id,
  vault_url,
  data,
}: TokensSkyflowRequest): Promise<any | ErrorResponse> {
  const skyflow = Skyflow.init({
    vaultID: vault_id,
    vaultURL: vault_url,
    getBearerToken: async () => await getVaultToken(baseUrl, apiKey),
    options: {
      logLevel: Skyflow.LogLevel.ERROR,
      env: Skyflow.Env.DEV,
    },
  });

  const collectContainer: CollectContainer = skyflow.container(
    Skyflow.ContainerType.COLLECT,
  ) as CollectContainer;

  const fieldPromises = await getFieldsPromise(data, collectContainer);

  const result = await Promise.all(fieldPromises);

  const mountFail = result.some((item: boolean) => !item);

  if (mountFail) {
    throw buildErrorResponseFromCatch(
      Error("Ocurrió un error al montar los campos de la tarjeta"),
    );
  } else {
    try {
      const collectResponseSkyflowTonder =
        (await collectContainer.collect()) as any;
      if (collectResponseSkyflowTonder)
        return collectResponseSkyflowTonder["records"][0]["fields"];
      throw buildErrorResponseFromCatch(
        Error("Por favor, verifica todos los campos de tu tarjeta"),
      );
    } catch (error) {
      throw buildErrorResponseFromCatch(error);
    }
  }
}

async function getFieldsPromise(data: any, collectContainer: CollectContainer): Promise<Promise<boolean>[]> {
    const fields = await getFields(data, collectContainer);
    if (!fields) return [];

return fields.map((field: { element: CollectElement, key: string }) => {
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
                    field.element.update({ value: value });
                    return resolve(field.element.isMounted());
                }
            }, 120);
        }, 120);
    });
})
}

async function getFields(data: any, collectContainer: CollectContainer): Promise<{ element: CollectElement, key: string }[]> {
    return await Promise.all(
        Object.keys(data).map(async (key) => {
            const cardHolderNameElement = await collectContainer.create({
                table: "cards",
                column: key,
                type: Skyflow.ElementType.INPUT_FIELD,
            });
            return { element: cardHolderNameElement, key: key };
        })
    )
}

