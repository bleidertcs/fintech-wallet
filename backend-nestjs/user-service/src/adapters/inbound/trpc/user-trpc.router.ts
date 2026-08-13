import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Injectable, Inject } from '@nestjs/common';
import { IUserServicePort, USER_SERVICE_PORT } from '../../../domain/ports/inbound/user.service.port';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

@Injectable()
export class UserTrpcRouter {
  constructor(
    @Inject(USER_SERVICE_PORT)
    private readonly userService: IUserServicePort,
  ) {}

  createRouter() {
    return router({
      getUserById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          try {
            const profile = await this.userService.getProfileById(input.id);
            return profile.toJSON();
          } catch (err: any) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: err.message,
            });
          }
        }),

      getUserByEmail: publicProcedure
        .input(z.object({ email: z.string().email() }))
        .query(async ({ input }) => {
          try {
            const profile = await this.userService.getProfileByEmail(input.email);
            return profile.toJSON();
          } catch (err: any) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: err.message,
            });
          }
        }),

      updateBalance: publicProcedure
        .input(z.object({ id: z.number(), amount: z.number() }))
        .mutation(async ({ input }) => {
          return this.userService.updateBalance(input.id, input.amount);
        }),
    });
  }
}

export type AppRouter = ReturnType<UserTrpcRouter['createRouter']>;
