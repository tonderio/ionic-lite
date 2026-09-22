// The secure token crosses into the SDK straight from an HTTP response body and is
// reused verbatim as an Authorization header value on every authenticated call. Only
// visible ASCII can travel in a header value, so anything else - whitespace, control
// characters, CR/LF, non-ASCII - is rejected here rather than deep inside fetch. The
// token format itself is deliberately not constrained, so it can change server-side.
export function validateSecureToken(secureToken: unknown): secureToken is string {
  return typeof secureToken === "string" && /^[\x21-\x7E]+$/.test(secureToken);
}

export function validateCardNumber(cardNumber: string) {
  const regex = /^\d{12,19}$/;
  return regex.test(cardNumber) && luhnCheck(cardNumber);
}

export function validateCardholderName(name: string) {
  const regex = /^([a-zA-Z\\ \\,\\.\\-\\']{2,})$/;
  return regex.test(name);
}

export function validateCVV(cvv: string) {
  const regex = /^\d{3,4}$/;
  return regex.test(cvv);
}

export function validateExpirationDate(expirationDate: string) {
  const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  if (!regex.test(expirationDate)) {
    return false;
  }
  const [month, year] = expirationDate.split("/");
  const currentDate = new Date();
  // @ts-ignore
  const expiration = new Date(`20${year}`, month - 1);
  return expiration >= currentDate;
}

export function validateExpirationMonth(month: string) {
  const regex = /^(0[1-9]|1[0-2])$/;
  return regex.test(month);
}

export function validateExpirationYear(year: string) {
  const regex = /^\d{2}$/;
  if (!regex.test(year)) {
    return false;
  }
  const currentYear = new Date().getFullYear() % 100;
  return parseInt(year, 10) >= currentYear;
}

const luhnCheck = (num: number | string) => {
  const arr = `${num}`
    .split("")
    .reverse()
    .map((x) => Number.parseInt(x));
  const lastDigit = arr.shift();
  let sum = arr.reduce(
    (acc, val, i) =>
      i % 2 !== 0 ? acc + val : acc + ((val *= 2) > 9 ? val - 9 : val),
    0,
  );
  sum += lastDigit!;
  return sum % 10 === 0;
};
