import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { AssetKind as PrismaAssetKind } from "@/generated/prisma/enums";
import { createCursorPage, type CursorPage } from "@/application/pagination";
import { AssetKind, type Asset, type NewAsset } from "@/domain";
import { toEntity } from "@/infrastructure/mappers/assets/asset.mapper";
import type {
  AssetListCursor,
  AssetRepository,
  DeletedAsset,
  ListOwnedAssetsInput,
} from "@/application/interfaces/repositories/asset.repository";

function toPrismaAssetKind(kind: AssetKind): PrismaAssetKind {
  switch (kind) {
    case AssetKind.IMAGE:
      return PrismaAssetKind.image;
    case AssetKind.VIDEO:
      return PrismaAssetKind.video;
  }
}

export class AssetPrismaRepository implements AssetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(asset: NewAsset): Promise<Asset> {
    const record = await this.prisma.asset.create({
      data: {
        userId: asset.userId,
        kind: toPrismaAssetKind(asset.kind),
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
      },
    });

    return toEntity(record);
  }

  async findOwnedById(id: string, userId: number): Promise<Asset | null> {
    const record = await this.prisma.asset.findFirst({
      where: { id, userId },
    });

    return record ? toEntity(record) : null;
  }

  async listOwned({
    userId,
    kind,
    limit,
    cursor,
  }: ListOwnedAssetsInput): Promise<CursorPage<Asset, AssetListCursor>> {
    const records = await this.prisma.asset.findMany({
      where: {
        userId,
        ...(kind ? { kind: toPrismaAssetKind(kind) } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.assetId } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    return createCursorPage(records.map(toEntity), limit, (asset) => ({
      createdAt: asset.createdAt,
      assetId: asset.id,
    }));
  }

  async deleteUnusedOwnedByIds(
    ids: readonly string[],
    userId: number,
  ): Promise<DeletedAsset[]> {
    if (ids.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(ids)];

    return this.prisma.$queryRaw<DeletedAsset[]>(Prisma.sql`
      DELETE FROM "assets" AS asset
      WHERE asset."user_id" = ${userId}
        AND asset."id" IN (${Prisma.join(uniqueIds)})
        AND NOT EXISTS (
          SELECT 1 FROM "message_assets" AS message_asset
          WHERE message_asset."asset_id" = asset."id"
        )
      RETURNING asset."id", asset."storage_key" AS "storageKey"
    `);
  }
}
