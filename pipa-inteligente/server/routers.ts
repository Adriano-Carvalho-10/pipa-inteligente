import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { communitiesRouter } from "./routers/communities";
import { trucksRouter } from "./routers/trucks";
import { driversRouter } from "./routers/drivers";

// Roteador raiz da aplicação: agrega todos os sub-roteadores por domínio
export const appRouter = router({
  system: systemRouter,

  // Autenticação: consulta o usuário atual e realiza logout limpando o cookie de sessão
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  communities: communitiesRouter,
  trucks: trucksRouter,
  drivers: driversRouter,
});

// Tipo exportado para uso no cliente tRPC (inferência de tipos end-to-end)
export type AppRouter = typeof appRouter;
