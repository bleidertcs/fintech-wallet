export const USER_SERVICE_CLIENT_PORT = Symbol('USER_SERVICE_CLIENT_PORT');

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
}

export interface UserServiceClientPort {
  getUserProfile(userId: number): Promise<UserProfileResponse | null>;
}
