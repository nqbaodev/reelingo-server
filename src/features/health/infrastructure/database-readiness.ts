export interface DatabaseReadiness {
  check(): Promise<boolean>;
}
