import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

// Tipo do contexto injetado em todas as procedures tRPC
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Em desenvolvimento sem OAuth configurado, autentica automaticamente como admin local
const IS_DEV_NO_OAUTH =
  process.env.NODE_ENV !== "production" && !process.env.OAUTH_SERVER_URL;

// Cria um usuário admin fictício para facilitar o desenvolvimento local sem OAuth
function makeDevAdminUser(): User {
  const now = new Date().toISOString();
  return {
    id: 1,
    openId: "local-admin",
    name: "Dev Admin",
    email: "admin@localhost",
    loginMethod: "dev",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

// Constrói o contexto para cada requisição: autentica o usuário via cookie de sessão
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Atalho de desenvolvimento: todas as requisições chegam como admin
  if (IS_DEV_NO_OAUTH) {
    return { req: opts.req, res: opts.res, user: makeDevAdminUser() };
  }

  let user: User | null = null;
  try {
    // Valida o token de sessão; erro é silencioso pois procedures públicas não precisam de auth
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // procedures públicas são permitidas sem autenticação
  }

  return { req: opts.req, res: opts.res, user };
}
