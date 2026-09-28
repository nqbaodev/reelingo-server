export interface User {
  id: number;
  email: string;
  googleId: string | null;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Pick<User, "email" | "displayName"> & {
  googleId: string;
};
export type ProfileUpdate = Pick<
  User,
  "displayName" | "avatarUrl" | "countryCode" | "phoneNumber" | "birthDate"
>;
