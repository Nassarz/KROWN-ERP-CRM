import { getSql } from '@/lib/neon-server';
import type { TenantContext } from '@/lib/tenant';
import { setTenantContext } from '@/lib/tenant';
import { generateId } from '@/lib/id';

export interface FloorPlanInput {
  name: string;
  branchId: string;
  description?: string;
}

export interface FloorPlanSectionInput {
  floorPlanId: string;
  name: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
  backgroundColor?: string;
}

export interface FloorPlanObjectInput {
  floorPlanId: string;
  sectionId: string;
  objectType: string;
  name: string;
  shape?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  capacity?: number;
  seatsConfig?: any[];
  status?: string;
  color?: string;
  metadata?: Record<string, any>;
  zIndex?: number;
}

export interface FloorPlan {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: any;
  updated_at: any;
}

export interface FloorPlanSection {
  id: string;
  floor_plan_id: string;
  organization_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  background_color: string;
  is_active: boolean;
  created_at: any;
  updated_at: any;
}

export interface FloorPlanObject {
  id: string;
  floor_plan_id: string;
  section_id: string;
  organization_id: string;
  object_type: string;
  name: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  seats_config: any[];
  status: string;
  color: string;
  metadata: Record<string, any>;
  z_index: number;
  created_at: any;
  updated_at: any;
}

// ── Floor Plans ──────────────────────────────────────────────────────────────

export async function listFloorPlans(ctx: TenantContext, branchId?: string): Promise<FloorPlan[]> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  if (branchId) {
    return await sql`SELECT * FROM floor_plans WHERE branch_id = ${branchId} AND organization_id = ${ctx.organizationId} ORDER BY created_at DESC` as FloorPlan[];
  }
  return await sql`SELECT * FROM floor_plans WHERE organization_id = ${ctx.organizationId} ORDER BY created_at DESC` as FloorPlan[];
}

export async function getFloorPlan(ctx: TenantContext, planId: string): Promise<FloorPlan | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const rows = await sql`SELECT * FROM floor_plans WHERE id = ${planId} AND organization_id = ${ctx.organizationId} LIMIT 1` as FloorPlan[];
  return rows[0] || null;
}

export async function createFloorPlan(ctx: TenantContext, input: FloorPlanInput): Promise<FloorPlan> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const id = generateId();
  const rows = await sql`
    INSERT INTO floor_plans (id, organization_id, branch_id, name, description, created_at, updated_at)
    VALUES (${id}, ${ctx.organizationId}, ${input.branchId}, ${input.name}, ${input.description || null}, NOW(), NOW())
    RETURNING *
  ` as FloorPlan[];
  return rows[0];
}

export async function updateFloorPlan(ctx: TenantContext, planId: string, updates: Partial<FloorPlanInput>): Promise<FloorPlan | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;
  if (updates.name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(updates.name); }
  if (updates.description !== undefined) { setClauses.push(`description = $${paramIdx++}`); values.push(updates.description); }
  if (updates.branchId !== undefined) { setClauses.push(`branch_id = $${paramIdx++}`); values.push(updates.branchId); }
  if (setClauses.length === 0) return getFloorPlan(ctx, planId);
  setClauses.push(`updated_at = NOW()`);
  values.push(planId, ctx.organizationId);
  const result = await sql(
    `UPDATE floor_plans SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND organization_id = $${paramIdx + 1} RETURNING *`,
    values
  ) as FloorPlan[];
  return result[0] || null;
}

export async function deleteFloorPlan(ctx: TenantContext, planId: string): Promise<void> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  await sql`DELETE FROM floor_plans WHERE id = ${planId} AND organization_id = ${ctx.organizationId}`;
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function listSections(ctx: TenantContext, planId: string): Promise<FloorPlanSection[]> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  return await sql`SELECT * FROM floor_plan_sections WHERE floor_plan_id = ${planId} AND organization_id = ${ctx.organizationId} ORDER BY sort_order ASC, name ASC` as FloorPlanSection[];
}

export async function getSection(ctx: TenantContext, sectionId: string): Promise<FloorPlanSection | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const rows = await sql`SELECT * FROM floor_plan_sections WHERE id = ${sectionId} AND organization_id = ${ctx.organizationId} LIMIT 1` as FloorPlanSection[];
  return rows[0] || null;
}

export async function createSection(ctx: TenantContext, input: FloorPlanSectionInput): Promise<FloorPlanSection> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const id = generateId();
  const rows = await sql`
    INSERT INTO floor_plan_sections (id, floor_plan_id, organization_id, name, icon, description, sort_order, background_color, created_at, updated_at)
    VALUES (${id}, ${input.floorPlanId}, ${ctx.organizationId}, ${input.name}, ${input.icon || null}, ${input.description || null}, ${input.sortOrder || 0}, ${input.backgroundColor || '#f8fafc'}, NOW(), NOW())
    RETURNING *
  ` as FloorPlanSection[];
  return rows[0];
}

export async function updateSection(ctx: TenantContext, sectionId: string, updates: Partial<FloorPlanSectionInput>): Promise<FloorPlanSection | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;
  if (updates.name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(updates.name); }
  if (updates.icon !== undefined) { setClauses.push(`icon = $${paramIdx++}`); values.push(updates.icon); }
  if (updates.description !== undefined) { setClauses.push(`description = $${paramIdx++}`); values.push(updates.description); }
  if (updates.sortOrder !== undefined) { setClauses.push(`sort_order = $${paramIdx++}`); values.push(updates.sortOrder); }
  if (updates.backgroundColor !== undefined) { setClauses.push(`background_color = $${paramIdx++}`); values.push(updates.backgroundColor); }
  if (setClauses.length === 0) return getSection(ctx, sectionId);
  setClauses.push(`updated_at = NOW()`);
  values.push(sectionId, ctx.organizationId);
  const result = await sql(
    `UPDATE floor_plan_sections SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND organization_id = $${paramIdx + 1} RETURNING *`,
    values
  ) as FloorPlanSection[];
  return result[0] || null;
}

export async function deleteSection(ctx: TenantContext, sectionId: string): Promise<void> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  await sql`DELETE FROM floor_plan_sections WHERE id = ${sectionId} AND organization_id = ${ctx.organizationId}`;
}

// ── Objects ──────────────────────────────────────────────────────────────────

export async function listObjects(ctx: TenantContext, planId: string, sectionId?: string): Promise<FloorPlanObject[]> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  if (sectionId) {
    return await sql`SELECT * FROM floor_plan_objects WHERE floor_plan_id = ${planId} AND section_id = ${sectionId} AND organization_id = ${ctx.organizationId} ORDER BY z_index ASC, created_at ASC` as FloorPlanObject[];
  }
  return await sql`SELECT * FROM floor_plan_objects WHERE floor_plan_id = ${planId} AND organization_id = ${ctx.organizationId} ORDER BY z_index ASC, created_at ASC` as FloorPlanObject[];
}

export async function getObject(ctx: TenantContext, objectId: string): Promise<FloorPlanObject | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const rows = await sql`SELECT * FROM floor_plan_objects WHERE id = ${objectId} AND organization_id = ${ctx.organizationId} LIMIT 1` as FloorPlanObject[];
  return rows[0] || null;
}

export async function createObject(ctx: TenantContext, input: FloorPlanObjectInput): Promise<FloorPlanObject> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const id = generateId();
  const rows = await sql`
    INSERT INTO floor_plan_objects (id, floor_plan_id, section_id, organization_id, object_type, name, shape, x, y, width, height, rotation, capacity, seats_config, status, color, metadata, z_index, created_at, updated_at)
    VALUES (
      ${id}, ${input.floorPlanId}, ${input.sectionId}, ${ctx.organizationId},
      ${input.objectType}, ${input.name}, ${input.shape || 'rectangle'},
      ${input.x || 0}, ${input.y || 0}, ${input.width || 120}, ${input.height || 120},
      ${input.rotation || 0}, ${input.capacity || 4},
      ${JSON.stringify(input.seatsConfig || [])}::jsonb,
      ${input.status || 'available'}, ${input.color || '#f97316'},
      ${JSON.stringify(input.metadata || {})}::jsonb,
      ${input.zIndex || 0}, NOW(), NOW()
    )
    RETURNING *
  ` as FloorPlanObject[];
  return rows[0];
}

export async function updateObject(ctx: TenantContext, objectId: string, updates: Partial<FloorPlanObjectInput>): Promise<FloorPlanObject | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;
  const fieldMap: Record<string, string> = {
    name: 'name', shape: 'shape', x: 'x', y: 'y', width: 'width', height: 'height',
    rotation: 'rotation', capacity: 'capacity', status: 'status', color: 'color', zIndex: 'z_index',
  };
  for (const [key, col] of Object.entries(fieldMap)) {
    if ((updates as any)[key] !== undefined) {
      setClauses.push(`${col} = $${paramIdx++}`);
      values.push((updates as any)[key]);
    }
  }
  if (updates.seatsConfig !== undefined) {
    setClauses.push(`seats_config = $${paramIdx++}::jsonb`);
    values.push(JSON.stringify(updates.seatsConfig));
  }
  if (updates.metadata !== undefined) {
    setClauses.push(`metadata = $${paramIdx++}::jsonb`);
    values.push(JSON.stringify(updates.metadata));
  }
  if (setClauses.length === 0) return getObject(ctx, objectId);
  setClauses.push(`updated_at = NOW()`);
  values.push(objectId, ctx.organizationId);
  const result = await sql(
    `UPDATE floor_plan_objects SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND organization_id = $${paramIdx + 1} RETURNING *`,
    values
  ) as FloorPlanObject[];
  return result[0] || null;
}

export async function batchUpdateObjects(ctx: TenantContext, updates: { id: string; data: Partial<FloorPlanObjectInput> }[]): Promise<void> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  for (const { id, data } of updates) {
    await updateObject(ctx, id, data);
  }
}

export async function deleteObject(ctx: TenantContext, objectId: string): Promise<void> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  await sql`DELETE FROM floor_plan_objects WHERE id = ${objectId} AND organization_id = ${ctx.organizationId}`;
}
