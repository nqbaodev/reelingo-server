export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Pick<User, "email" | "name">;
export type UserUpdate = Partial<Pick<User, "email" | "name">>;
