import type { User } from "../../domain";

export interface CurrentUserResponse {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
}

export function toCurrentUserResponse(user: User): CurrentUserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
    phoneNumber: user.phoneNumber,
    birthDate: user.birthDate,
  };
}
