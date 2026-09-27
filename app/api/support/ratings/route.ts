// Support ratings for the super-admin dashboard (progress bars + averages).

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const data = await cached('sa:support-ratings:v1', 15_000, async () => {
      const sql = getSql();
      const [agg, histogram, recent] = await Promise.all([
        sql`
          SELECT
            COUNT(*)::int as total_reviews,
            COALESCE(ROUND(AVG(rating)::numeric, 2), 0) as average_rating,
            COUNT(*) FILTER (WHERE rating >= 4)::int as delighted,
            COUNT(*) FILTER (WHERE rating = 3)::int as okay,
            COUNT(*) FILTER (WHERE rating <= 2)::int as unhappy
          FROM support_conversations
          WHERE rating IS NOT NULL
        `,
        sql`
          SELECT rating, COUNT(*)::int as count
          FROM support_conversations
          WHERE rating IS NOT NULL
          GROUP BY rating
          ORDER BY rating ASC
        `,
        sql`
          SELECT sc.id, sc.rating, sc.review, sc.reviewed_at, sc.subject, o.name as org_name, sc.organization_id
          FROM support_conversations sc
          LEFT JOIN organizations o ON o.id = sc.organization_id
          WHERE sc.rating IS NOT NULL
          ORDER BY sc.reviewed_at DESC
          LIMIT 20
        `,
      ]);

      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const row of histogram as any[]) counts[Number(row.rating)] = row.count;
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

      return {
        summary: {
          totalReviews: Number(agg[0]?.total_reviews ?? 0),
          averageRating: Number(agg[0]?.average_rating ?? 0),
          delighted: Number(agg[0]?.delighted ?? 0),
          okay: Number(agg[0]?.okay ?? 0),
          unhappy: Number(agg[0]?.unhappy ?? 0),
        },
        // 1..5 → percentage bars for the dashboard
        bars: [1, 2, 3, 4, 5].map(star => ({
          star,
          count: counts[star],
          percent: Math.round((counts[star] / total) * 100),
        })),
        recent,
      };
    });

    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load ratings' }, { status: 500 });
  }
}
