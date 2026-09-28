/** E.164 country calling code digits, without the leading plus sign. */
export const COUNTRY_CODE_PATTERN = /^[1-9]\d{0,2}$/;

/** National significant number digits; the country calling code is stored separately. */
export const NATIONAL_PHONE_NUMBER_PATTERN = /^\d{4,15}$/;
