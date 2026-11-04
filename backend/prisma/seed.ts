import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Academy Settings
  const existingSetting = await prisma.academySetting.findFirst();
  if (!existingSetting) {
    await prisma.academySetting.create({
      data: {
        academyName: 'Arte Suave BJJ Academy',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
      },
    });
    console.log('✅ Academy settings seeded');
  }

  // 2. Admin User (Configured strictly via environment variables, never hardcoded in source)
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'AdminDojo';
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@dojo.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      'Security error: INITIAL_ADMIN_PASSWORD environment variable is not defined. Please define INITIAL_ADMIN_PASSWORD in your .env file or cloud environment variables.',
    );
  }

  // Remove any obsolete legacy demo admin user
  await prisma.user.deleteMany({
    where: {
      email: 'admin@jiujitsu.com',
      username: null,
    },
  });

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      username: adminUsername,
      passwordHash,
      name: 'Head Coach & Admin',
      role: Role.ADMIN,
    },
    create: {
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      name: 'Head Coach & Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin account configured successfully (Username: ${adminUsername})`);

  // 3. Base Courses
  const baseCourses = [
    { name: 'BJJ Fundamentals (Gi)', description: 'White to blue belt core positions and escapes', colorHex: '#3B82F6' },
    { name: 'BJJ Advanced (Gi)', description: 'Complex guard passes, leg locks, and submissions', colorHex: '#8B5CF6' },
    { name: 'No-Gi Submission Wrestling', description: 'Wrestling takedowns and submission grappling without kimono', colorHex: '#EF4444' },
    { name: 'Open Mat / Sparring', description: 'Free rolling session under supervision', colorHex: '#10B981' },
    { name: 'Kids BJJ Program', description: 'Agility, discipline, and basic self-defense for children', colorHex: '#F59E0B' },
  ];

  for (const course of baseCourses) {
    await prisma.course.upsert({
      where: { name: course.name },
      update: {},
      create: course,
    });
  }
  console.log('✅ Base courses seeded');

  // 4. Subscription Plans
  const plans = [
    { name: '1 Month Standard Plan', durationMonths: 1, price: 80.0 },
    { name: '3 Months Quarterly Plan', durationMonths: 3, price: 220.0 },
    { name: '6 Months Semester Plan', durationMonths: 6, price: 420.0 },
    { name: '12 Months Annual Pass', durationMonths: 12, price: 780.0 },
  ];

  for (const plan of plans) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: plan.name },
    });
    if (!existingPlan) {
      await prisma.subscriptionPlan.create({ data: plan });
    }
  }
  console.log('✅ Subscription plans seeded');

  console.log('🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

