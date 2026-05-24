export type SystemConfigType = "integer" | "decimal" | "string";

export interface SystemConfiguration {
  key: string;
  value: string;
  type: SystemConfigType;
  label: string;
  description: string | null;
}
