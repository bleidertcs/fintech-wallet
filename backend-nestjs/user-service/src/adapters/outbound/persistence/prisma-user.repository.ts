import { Injectable } from '@nestjs/common';
import { IUserRepositoryPort } from '../../../domain/ports/outbound/user.repository.port';
import { UserProfileEntity } from '../../../domain/entities/user-profile.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepositoryPort {
  private readonly cache = new Map<number, { entity: UserProfileEntity; expiresAt: number }>();
  private readonly emailToId = new Map<string, number>();
  private readonly TTL_MS = 15_000; // 15 segundos de caché de lectura ultrarrápida

  constructor(private readonly prisma: PrismaService) {}

  private setCache(entity: UserProfileEntity) {
    if (this.cache.size > 5000) {
      const first = this.cache.keys().next().value;
      if (first !== undefined) this.invalidateCache(first);
    }
    this.cache.set(entity.id, { entity, expiresAt: Date.now() + this.TTL_MS });
    this.emailToId.set(entity.email.toLowerCase(), entity.id);
  }

  private invalidateCache(id: number) {
    const cached = this.cache.get(id);
    if (cached) {
      this.emailToId.delete(cached.entity.email.toLowerCase());
      this.cache.delete(id);
    }
  }

  async findById(id: number): Promise<UserProfileEntity | null> {
    const cached = this.cache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.entity;
    }

    const record = await this.prisma.userProfile.findUnique({
      where: { id: BigInt(id) },
    });
    if (!record) return null;
    const entity = this.mapToEntity(record);
    this.setCache(entity);
    return entity;
  }

  async findByEmail(email: string): Promise<UserProfileEntity | null> {
    const id = this.emailToId.get(email.toLowerCase());
    if (id) {
      const cached = this.cache.get(id);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.entity;
      }
    }

    const record = await this.prisma.userProfile.findUnique({
      where: { email },
    });
    if (!record) return null;
    const entity = this.mapToEntity(record);
    this.setCache(entity);
    return entity;
  }

  async findAll(): Promise<UserProfileEntity[]> {
    const records = await this.prisma.userProfile.findMany();
    return records.map((record) => this.mapToEntity(record));
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
        currency: String(profile.currency || 'VES'),
      },
    });
    const entity = this.mapToEntity(record);
    this.setCache(entity);
    return entity;
  }

  async updateBalance(id: number, amount: number): Promise<boolean> {
    try {
      this.invalidateCache(id);
      if (amount < 0) {
        const absAmount = Math.abs(amount);
        const count = await this.prisma.$executeRaw`
          UPDATE user_profiles 
          SET balance = balance - ${absAmount} 
          WHERE id = ${BigInt(id)} AND balance >= ${absAmount}
        `;
        return count > 0;
      } else {
        await this.prisma.userProfile.update({
          where: { id: BigInt(id) },
          data: {
            balance: {
              increment: amount,
            },
          },
        });
        return true;
      }
    } catch {
      return false;
    }
  }

  async updateSettings(id: number, dailyLimit?: number, currency?: string): Promise<UserProfileEntity | null> {
    try {
      this.invalidateCache(id);
      const data: any = {};
      if (dailyLimit !== undefined) data.dailyLimit = dailyLimit;
      if (currency !== undefined) data.currency = currency;

      const record = await this.prisma.userProfile.update({
        where: { id: BigInt(id) },
        data,
      });
      const entity = this.mapToEntity(record);
      this.setCache(entity);
      return entity;
    } catch {
      return null;
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
