const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@turnfix.com' }
    });

    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const user = await prisma.user.create({
      data: {
        email: 'admin@turnfix.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      }
    });

    console.log('Test user created successfully:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

  } catch (error) {
    console.error('Error creating test user:', error.message);
    if (error.code === 'P2002') {
      console.error('User with this email or username already exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
