import fs from 'fs';
import path from 'path';

// Parse .env file manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

import { Agent, setGlobalDispatcher } from 'undici';
try { setGlobalDispatcher(new Agent({ connect: { family: 4 } })); } catch (e) {}

async function run() {
  const { getSql } = await import('../lib/neon-server');
  const sql = getSql();
  console.log('Testing Neon connection...');
  const testRes = await sql`SELECT NOW()`;
  console.log('Neon connected at:', testRes[0].now);

  const migrationFile = process.argv[2] || './migrations/003_wave3_field_operations.sql';
  console.log(`Reading migration: ${migrationFile}`);
  const sqlText = fs.readFileSync(path.resolve(process.cwd(), migrationFile), 'utf8');

  try {
    await (sql as any)(sqlText);
    console.log(`✅ Successfully executed whole migration file ${migrationFile}`);
  } catch (err: any) {
    console.warn(`Execution warning: ${err?.message || err}. Falling back to clean statement loop...`);
    const statements = sqlText
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let count = 0;
    for (const stmt of statements) {
      try {
        await (sql as any)(stmt);
        count++;
      } catch (e: any) {
        console.warn(`Statement warning: ${e?.message || e}`);
      }
    }
    console.log(`Executed ${count}/${statements.length} statements.`);
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
