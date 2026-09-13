export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Pick<User, "email" | "name"> &
  Partial<Pick<User, "googleId" | "avatarUrl">>;
export type UserUpdate = Partial<
  Pick<User, "email" | "name" | "googleId" | "avatarUrl">
>;
