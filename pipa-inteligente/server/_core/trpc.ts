import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// Inicializa o tRPC com o contexto da aplicação e serialização via superjson (suporta Date, Map, etc.)
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

// Roteador base para agrupar procedures
export const router = t.router;

// Procedure pública: acessível sem autenticação
export const publicProcedure = t.procedure;

// Middleware que garante que o usuário esteja autenticado antes de executar a procedure
const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Procedure protegida: exige usuário autenticado (qualquer papel)
export const protectedProcedure = t.procedure.use(requireUser);

// Procedure de admin: exige papel "admin"; lança FORBIDDEN para outros papéis
export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
