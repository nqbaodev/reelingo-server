import type { NewUser, ProfileUpdate, User } from "../../domain";

/**
 * Contract the application layer codes against; implemented by the
 * concrete adapter in this same layer (e.g. UserPrismaRepository).
 */
export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  updateProfile(id: number, data: ProfileUpdate): Promise<User>;
}
