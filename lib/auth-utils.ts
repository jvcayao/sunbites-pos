export function getHomeRoute(roles: string[]): string {
  return roles.includes("cashier") ? "/pos" : "/dashboard";
}
