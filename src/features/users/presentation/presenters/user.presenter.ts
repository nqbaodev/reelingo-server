import type { User } from "../../domain";
import type { CurrentUserResponseDto } from "../dtos/user.dto";

export function toCurrentUserResponse(user: User): CurrentUserResponseDto {
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
