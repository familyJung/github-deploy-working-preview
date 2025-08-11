import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../server/db.js';
import { jobPostings } from '../shared/schema.js';
import { count, gte, sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const currentDate = new Date();
      
      // 전체 채용공고 수 (현재 유효한)
      const [{ count: totalJobs }] = await db
        .select({ count: count() })
        .from(jobPostings)
        .where(gte(jobPostings.applicationPeriodEnd, currentDate));

      // 긴급 채용공고 수
      const [{ count: urgentJobs }] = await db
        .select({ count: count() })
        .from(jobPostings)
        .where(sql`${jobPostings.isUrgent} = true AND ${jobPostings.applicationPeriodEnd} >= ${currentDate}`);

      // 신규 채용공고 수 (최근 7일)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const [{ count: newJobs }] = await db
        .select({ count: count() })
        .from(jobPostings)
        .where(sql`${jobPostings.isNew} = true AND ${jobPostings.createdAt} >= ${weekAgo} AND ${jobPostings.applicationPeriodEnd} >= ${currentDate}`);

      // 고유한 부처 수
      const ministries = await db
        .selectDistinct({ ministry: jobPostings.ministry })
        .from(jobPostings)
        .where(gte(jobPostings.applicationPeriodEnd, currentDate));

      res.status(200).json({
        totalJobs: totalJobs || 0,
        urgentJobs: urgentJobs || 0,
        newJobs: newJobs || 0,
        ministries: ministries.length || 0
      });
    } catch (error) {
      console.error('Statistics API error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}