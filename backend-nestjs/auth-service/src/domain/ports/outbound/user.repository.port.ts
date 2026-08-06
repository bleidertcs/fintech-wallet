import { User } from '../../entities/user.entity';

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');

export interface UserRepositoryPort {
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: bigint): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  update(user: User): Promise<User>;
}
