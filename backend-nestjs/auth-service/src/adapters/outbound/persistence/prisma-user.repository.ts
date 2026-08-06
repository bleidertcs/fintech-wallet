import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../domain/ports/outbound/user.repository.port';
import { User } from '../../../domain/entities/user.entity';
import { PrismaService } from './prisma.service';
import { User as PrismaUserModel } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: user.email,
        password: user.password,
        role: user.role,
        verified: user.verified,
        verificationToken: user.verificationToken,
        totpSecret: user.totpSecret,
        totpEnabled: user.totpEnabled,
      },
    });
    return this.toDomain(created);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const found = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    return found ? this.toDomain(found) : null;
  }

  async findById(id: bigint): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: { id },
    });
    return found ? this.toDomain(found) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const found = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });
    return found ? this.toDomain(found) : null;
  }

  async update(user: User): Promise<User> {
    if (!user.id) {
      throw new Error('No se puede actualizar un usuario sin id');
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        password: user.password,
        role: user.role,
        verified: user.verified,
        verificationToken: user.verificationToken,
        totpSecret: user.totpSecret,
        totpEnabled: user.totpEnabled,
      },
    });
    return this.toDomain(updated);
  }

  private toDomain(model: PrismaUserModel): User {
    return new User({
      id: model.id,
      email: model.email,
      password: model.password,
      role: model.role,
      verified: model.verified,
      verificationToken: model.verificationToken,
      totpSecret: model.totpSecret,
      totpEnabled: model.totpEnabled,
    });
  }
}
