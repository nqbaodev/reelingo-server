import { MAX_AVATAR_URL_LENGTH, MAX_DISPLAY_NAME_LENGTH } from "@/config";
import {
  API_DATE_ONLY_FORMAT,
  COUNTRY_CODE_PATTERN,
  NATIONAL_PHONE_NUMBER_PATTERN,
  toDateOnlyString,
} from "@/core/utils";
import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_DISPLAY_NAME_LENGTH);
export const countryCodeSchema = z
  .string()
  .trim()
  .regex(COUNTRY_CODE_PATTERN);
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(NATIONAL_PHONE_NUMBER_PATTERN);
export const avatarUrlSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/ }).max(MAX_AVATAR_URL_LENGTH));
export const birthDateSchema = z
  .iso
  .date(`Birth date must use ${API_DATE_ONLY_FORMAT}`)
  .refine(
    (value) => value <= toDateOnlyString(new Date()),
    "Birth date cannot be in the future",
  )
  .describe(`Calendar date using ${API_DATE_ONLY_FORMAT}`);

export const updateProfileSchema = z.strictObject({
  displayName: displayNameSchema,
  avatarUrl: avatarUrlSchema.nullable(),
  countryCode: countryCodeSchema.nullable(),
  phoneNumber: phoneNumberSchema.nullable(),
  birthDate: birthDateSchema.nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
