import { appConfig } from "./app-config";

/** Public facade for validated environment-backed application settings. */
export const config = appConfig;

export type Config = typeof config;
