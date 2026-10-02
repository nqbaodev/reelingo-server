import type { AssetKind } from "@/domain";
import type { AiModelRoute } from "@/domain";

export interface MediaGenerationRouteResolver {
  resolveRoute(type: AssetKind): AiModelRoute;
}

export class ConfiguredMediaGenerationRouteResolver implements MediaGenerationRouteResolver {
  constructor(private readonly routes: Readonly<Record<AssetKind, AiModelRoute>>) {}

  resolveRoute(type: AssetKind): AiModelRoute {
    return this.routes[type];
  }
}
