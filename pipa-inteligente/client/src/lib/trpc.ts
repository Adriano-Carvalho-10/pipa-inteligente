import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

// Cliente tRPC tipado para uso nos componentes React — todas as chamadas ao servidor passam por aqui
export const trpc = createTRPCReact<AppRouter>();
