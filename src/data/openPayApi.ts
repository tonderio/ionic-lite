export async function getOpenpayDeviceSessionID(
  merchant_id: string,
  public_key: string,
  isSandbox: boolean = true,
  signal: AbortSignal | null = null,
): Promise<string> {
  let openpay = await window.OpenPay;
  openpay.setId(merchant_id);
  openpay.setApiKey(public_key);
  openpay.setSandboxMode(isSandbox);
  return await openpay.deviceData.setup({ signal });
}
