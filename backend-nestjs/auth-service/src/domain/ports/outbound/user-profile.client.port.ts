export const USER_PROFILE_CLIENT_PORT = Symbol('USER_PROFILE_CLIENT_PORT');

export interface UserProfileClientPort {
  createUserProfile(userId: bigint, name: string, email: string): Promise<void>;
}
