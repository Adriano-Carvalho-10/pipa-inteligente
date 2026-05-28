export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Gera a URL de login em tempo de execução para que o redirectUri reflita a origem atual do browser
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  if (!oauthPortalUrl) return "/";

  const appId = import.meta.env.VITE_APP_ID ?? "local-dev";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Codifica o redirectUri em base64 como parâmetro de estado OAuth
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
