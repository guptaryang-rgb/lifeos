import prisma from '../../src/lib/prisma';

async function main() {
  console.log("Checking DB connection...");
  const user = await prisma.user.findUnique({
    where: { email: 'john@example.com' }
  });
  console.log("Found user:", user);
}

main().catch(err => {
  console.error("CRASH ERROR:", err);
  process.exit(1);
});
