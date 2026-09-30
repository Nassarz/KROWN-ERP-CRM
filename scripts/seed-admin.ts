import argon2 from 'argon2';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  const email = 'admin@krown.ug';
  const password = 'admin123';
  const name = 'Super Admin';

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 1. Insert into super_admins table
  const existingSuper = await sql`SELECT id FROM super_admins WHERE email = ${email} LIMIT 1`;
  if (existingSuper.length === 0) {
    await sql`
      INSERT INTO super_admins (name, email, password_hash, status)
      VALUES (${name}, ${email}, ${hash}, 'active')
    `;
    console.log(`✓ Created super_admins entry: ${email}`);
  } else {
    await sql`
      UPDATE super_admins
      SET password_hash = ${hash}, status = 'active'
      WHERE email = ${email}
    `;
    console.log(`✓ Updated super_admins password for: ${email}`);
  }

  // 2. Also ensure staff table has password_argon2 set
  await sql`
    UPDATE staff
    SET password_argon2 = ${hash}, password_hash = ${hash}, status = 'active'
    WHERE email = ${email}
  `;
  console.log(`✓ Updated staff entry for: ${email}`);
}

main().then(() => {
  console.log('Admin user setup complete.');
  process.exit(0);
}).catch((err) => {
  console.error('Error setting up admin:', err);
  process.exit(1);
});
