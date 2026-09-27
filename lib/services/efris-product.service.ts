// ============================================================================
// KROWN ERP — EFRIS product fiscal mapping service
// Maps KROWN menu products to fiscal attributes (tax category, commodity
// code). Does NOT touch the configured KROWN selling price — fiscal/tax
// computation never silently modifies menu prices.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import type { EfrisProductMappingStatus, EfrisTaxCategory } from '@/lib/efris/types';
import { logAuditEvent } from '@/lib/audit';

export interface ProductMappingRow {
  id: string;
  organizationId: string;
  productId: string;
  productName: string | null;
  categoryName: string | null;
  price: number | null;
  mappingStatus: EfrisProductMappingStatus;
  taxCategory: EfrisTaxCategory | null;
  commodityCategoryId: string | null;
  commodityGoodsId: string | null;
  goodsCode: string | null;
  unitOfMeasure: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface MapProductInput {
  organizationId: string;
  productId: string;
  actor: { userId: string; role: string; userEmail?: string };
  taxCategory: EfrisTaxCategory;
  commodityCategoryId?: string | null;
  commodityGoodsId?: string | null;
  goodsCode?: string | null;
  unitOfMeasure?: string | null;
}

export async function listProductMappings(
  organizationId: string,
  opts: { search?: string; status?: EfrisProductMappingStatus; limit?: number; offset?: number } = {},
): Promise<{ mappings: ProductMappingRow[]; total: number }> {
  const sql = getSql();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const base = `
    FROM products p
    LEFT JOIN efris_products ep ON ep.product_id = p.id AND ep.organization_id = p.organization_id
    WHERE p.organization_id = ${organizationId}
  `;
  const conditions: string[] = [];
  if (opts.search) conditions.push(`p.name ILIKE ${'%' + opts.search + '%'}`);
  if (opts.status) conditions.push(`COALESCE(ep.mapping_status, 'needs_mapping') = ${opts.status}`);
  const whereExtra = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';

  const totalRows = await sql(`SELECT COUNT(*)::int AS total ${base} ${whereExtra}`);
  const total = Number((totalRows as any[])[0]?.total ?? 0);

  const rows = await sql(`
    SELECT
      COALESCE(ep.id, '') AS id,
      p.id AS product_id,
      p.name AS product_name,
      p.category AS category_name,
      p.price AS price,
      COALESCE(ep.mapping_status, 'needs_mapping') AS mapping_status,
      ep.tax_category AS tax_category,
      ep.commodity_category_id AS commodity_category_id,
      ep.commodity_goods_id AS commodity_goods_id,
      ep.goods_code AS goods_code,
      ep.unit_of_measure AS unit_of_measure,
      ep.last_sync_at AS last_sync_at,
      ep.last_error AS last_error,
      COALESCE(ep.updated_at, p.updated_at) AS updated_at
    ${base} ${whereExtra}
    ORDER BY COALESCE(ep.mapping_status, 'needs_mapping') = 'mapped' ASC,
             p.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    total,
    mappings: (rows as any[]).map(r => ({
      id: r.id,
      organizationId,
      productId: r.product_id,
      productName: r.product_name,
      categoryName: r.category_name,
      price: r.price == null ? null : Number(r.price),
      mappingStatus: r.mapping_status,
      taxCategory: r.tax_category ?? null,
      commodityCategoryId: r.commodity_category_id ?? null,
      commodityGoodsId: r.commodity_goods_id ?? null,
      goodsCode: r.goods_code ?? null,
      unitOfMeasure: r.unit_of_measure ?? null,
      lastSyncAt: r.last_sync_at ?? null,
      lastError: r.last_error ?? null,
      updatedAt: r.updated_at,
    })),
  };
}

export async function mapProduct(input: MapProductInput): Promise<ProductMappingRow> {
  const sql = getSql();

  const productRows = await sql`SELECT id FROM products WHERE id = ${input.productId} AND organization_id = ${input.organizationId} LIMIT 1`;
  if (!productRows.length) throw new Error('Product not found');

  const existing = await sql`SELECT * FROM efris_products WHERE product_id = ${input.productId} AND organization_id = ${input.organizationId} LIMIT 1`;

  let id: string;
  if (existing.length) {
    id = (existing[0] as any).id;
    await sql`
      UPDATE efris_products SET
        tax_category = ${input.taxCategory},
        commodity_category_id = ${input.commodityCategoryId ?? null},
        commodity_goods_id = ${input.commodityGoodsId ?? null},
        goods_code = ${input.goodsCode ?? null},
        unit_of_measure = ${input.unitOfMeasure ?? null},
        mapping_status = 'mapped',
        last_error = NULL,
        updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${input.organizationId}
    `;
  } else {
    id = generateId();
    await sql`
      INSERT INTO efris_products (
        id, organization_id, product_id, tax_category, commodity_category_id,
        commodity_goods_id, goods_code, unit_of_measure, mapping_status,
        created_at, updated_at
      ) VALUES (
        ${id}, ${input.organizationId}, ${input.productId}, ${input.taxCategory},
        ${input.commodityCategoryId ?? null}, ${input.commodityGoodsId ?? null},
        ${input.goodsCode ?? null}, ${input.unitOfMeasure ?? null},
        'mapped', NOW(), NOW()
      )
    `;
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    userEmail: input.actor.userEmail ?? '',
    actorRole: input.actor.role,
    action: 'EFRIS_PRODUCT_MAPPED',
    targetType: 'product',
    targetId: input.productId,
    details: { taxCategory: input.taxCategory },
  }).catch(() => {});

  const updated = await sql`SELECT * FROM efris_products WHERE id = ${id} AND organization_id = ${input.organizationId} LIMIT 1`;
  const row = updated[0] as any;
  const product = productRows[0] as any;
  return {
    id: row.id,
    organizationId: input.organizationId,
    productId: row.product_id,
    productName: null,
    categoryName: null,
    price: null,
    mappingStatus: row.mapping_status,
    taxCategory: row.tax_category ?? null,
    commodityCategoryId: row.commodity_category_id ?? null,
    commodityGoodsId: row.commodity_goods_id ?? null,
    goodsCode: row.goods_code ?? null,
    unitOfMeasure: row.unit_of_measure ?? null,
    lastSyncAt: row.last_sync_at ?? null,
    lastError: row.last_error ?? null,
    updatedAt: row.updated_at,
  };
}

export async function unmapProduct(input: {
  organizationId: string;
  productId: string;
  actor: { userId: string; role: string; userEmail?: string };
}): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE efris_products SET mapping_status = 'needs_mapping', updated_at = NOW()
    WHERE product_id = ${input.productId} AND organization_id = ${input.organizationId}
  `;
  await logAuditEvent({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    userEmail: input.actor.userEmail ?? '',
    actorRole: input.actor.role,
    action: 'EFRIS_PRODUCT_UNMAPPED',
    targetType: 'product',
    targetId: input.productId,
    details: {},
  }).catch(() => {});
}

/** Readiness summary for the Overview screen */
export async function productReadinessSummary(organizationId: string): Promise<{
  total: number;
  mapped: number;
  needsMapping: number;
  invalid: number;
  error: number;
}> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ep.mapping_status = 'mapped')::int AS mapped,
      COUNT(*) FILTER (WHERE ep.mapping_status IS NULL OR ep.mapping_status = 'needs_mapping')::int AS needs_mapping,
      COUNT(*) FILTER (WHERE ep.mapping_status = 'invalid')::int AS invalid,
      COUNT(*) FILTER (WHERE ep.mapping_status = 'error')::int AS error
    FROM products p
    LEFT JOIN efris_products ep ON ep.product_id = p.id AND ep.organization_id = p.organization_id
    WHERE p.organization_id = ${organizationId}
  `;
  const r = (rows as any[])[0] ?? {};
  return {
    total: Number(r.total ?? 0),
    mapped: Number(r.mapped ?? 0),
    needsMapping: Number(r.needs_mapping ?? 0),
    invalid: Number(r.invalid ?? 0),
    error: Number(r.error ?? 0),
  };
}
