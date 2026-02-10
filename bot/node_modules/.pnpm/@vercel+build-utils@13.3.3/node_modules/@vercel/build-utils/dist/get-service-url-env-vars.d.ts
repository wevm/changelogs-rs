import type { Service } from './types';
type Envs = {
    [key: string]: string | undefined;
};
interface FrameworkInfo {
    slug: string | null;
    envPrefix?: string;
}
export interface GetServiceUrlEnvVarsOptions {
    services: Service[];
    frameworkList: readonly FrameworkInfo[];
    currentEnv?: Envs;
    deploymentUrl?: string;
}
/**
 * Generate environment variables for service URLs.
 *
 * For each web service, generates:
 * 1. A base env var (e.g., BACKEND_URL)
 * 2. Framework-prefixed versions for each frontend framework in the deployment
 *    (e.g., VITE_BACKEND_URL, NEXT_PUBLIC_BACKEND_URL) so they can be accessed
 *    in client-side code.
 *
 * Environment variables that are already set in `currentEnv` will NOT be overwritten,
 * allowing user-defined values to take precedence.
 */
export declare function getServiceUrlEnvVars(options: GetServiceUrlEnvVarsOptions): Record<string, string>;
export {};
