export const ENV = {
  appId: process.env.VITE_APP_ID ?? "local-dev",
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "./pipa.db",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "local-admin",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  iotApiToken: process.env.IOT_API_TOKEN ?? "dev-iot-token-change-in-production",
  mqttBrokerUrl: process.env.MQTT_BROKER_URL ?? "",
};
