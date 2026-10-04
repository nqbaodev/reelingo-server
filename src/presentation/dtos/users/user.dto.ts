import { z } from "zod";
import {
  MAX_AVATAR_URL_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_POSTGRES_INTEGER,
} from "@/application/constants";
import {
  COUNTRY_CODE_PATTERN,
  DATE_ONLY_FORMAT,
  NATIONAL_PHONE_NUMBER_PATTERN,
  toDateOnlyString,
} from "@/utils";

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
  .date(`Birth date must use ${DATE_ONLY_FORMAT}`)
  .refine(
    (value) => value <= toDateOnlyString(new Date()),
    "Birth date cannot be in the future",
  )
  .describe(`Calendar date using ${DATE_ONLY_FORMAT}`);

export const updateProfileSchema = z.strictObject({
  displayName: displayNameSchema,
  avatarUrl: avatarUrlSchema.nullable(),
  countryCode: countryCodeSchema.nullable(),
  phoneNumber: phoneNumberSchema.nullable(),
  birthDate: birthDateSchema.nullable(),
});

export type UpdateProfileRequestDto = z.infer<typeof updateProfileSchema>;

export const currentUserResponseSchema = z.object({
  id: z.number().int().positive().max(MAX_POSTGRES_INTEGER),
  email: z.email(),
  displayName: displayNameSchema,
  avatarUrl: avatarUrlSchema.nullable(),
  countryCode: countryCodeSchema.nullable(),
  phoneNumber: phoneNumberSchema.nullable(),
  birthDate: birthDateSchema.nullable(),
});

export type CurrentUserResponseDto = z.infer<typeof currentUserResponseSchema>;
