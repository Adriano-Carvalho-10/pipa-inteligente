import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Verifica se o host é um endereço IP (IPv4 ou IPv6)
function isIpAddress(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

// Retorna true se a requisição chegou por HTTPS (direto ou via proxy reverso)
function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

// Retorna as opções de cookie de sessão adequadas ao ambiente (dev/prod, HTTP/HTTPS)
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,   // Inacessível via JavaScript do browser
    path: "/",
    sameSite: "none", // Necessário para requisições cross-origin (OAuth redirect)
    secure: isSecureRequest(req),
  };
}
