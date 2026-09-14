export interface User {
  id: number;
  email: string;
  name: string;
  googleId: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_USER_ID = 2_147_483_647;

export type NewUser = Pick<User, "email" | "name" | "avatarUrl"> & {
  googleId: string;
};
export type ProfileUpdate = Partial<Pick<User, "name" | "avatarUrl">>;
