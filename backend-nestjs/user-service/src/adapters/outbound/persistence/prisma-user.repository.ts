import { Injectable } from '@nestjs/common';
import { IUserRepositoryPort } from '../../../domain/ports/outbound/user.repository.port';
import { UserProfileEntity } from '../../../domain/entities/user-profile.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<UserProfileEntity | null> {
    const record = await this.prisma.userProfile.findUnique({
      where: { id: BigInt(id) },
    });
    if (!record) return null;
    return this.mapToEntity(record);
  }

  async findByEmail(email: string): Promise<UserProfileEntity | null> {
    const record = await this.prisma.userProfile.findUnique({
      where: { email },
    });
    if (!record) return null;
    return this.mapToEntity(record);
  }

  async save(profile: Partial<UserProfileEntity>): Promise<UserProfileEntity> {
    const record = await this.prisma.userProfile.upsert({
      where: { email: profile.email || '' },
      update: {
        name: profile.name,
        balance: profile.balance !== undefined ? profile.balance : undefined,
        dailyLimit: profile.dailyLimit !== undefined ? profile.dailyLimit : undefined,
        currency: profile.currency !== undefined ? String(profile.currency) : undefined,
      },
      create: {
        name: profile.name || '',
        email: profile.email || '',
        balance: profile.balance || 0,
        dailyLimit: profile.dailyLimit || 50000,
        currency: String(profile.currency || 'ARS'),
      },
    });
    return this.mapToEntity(record);
  }

  async updateBalance(id: number, amount: number): Promise<boolean> {
    try {
      await this.prisma.userProfile.update({
        where: { id: BigInt(id) },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  private mapToEntity(record: any): UserProfileEntity {
    return new UserProfileEntity(
      Number(record.id),
      record.name,
      record.email,
      Number(record.balance),
      Number(record.dailyLimit),
      record.currency,
    );
  }
}
