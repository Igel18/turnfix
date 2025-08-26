const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Use direct database connection to check existing structure
const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres:pgadmin@localhost:5432/turnfix?schema=public"
});

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Try to check if auth tables exist
    try {
      const userCount = await prisma.$queryRaw`SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users'`;
      console.log('Users table exists check:', userCount);
    } catch (error) {
      console.log('Users table does not exist, will create manually');
    }

    // Check existing TurnFix tables
    try {
      const clubs = await prisma.$queryRaw`SELECT COUNT(*) FROM tfx_vereine LIMIT 1`;
      console.log('TurnFix clubs table accessible:', clubs);
    } catch (error) {
      console.log('Could not access TurnFix tables:', error.message);
    }

    // Try to create users table manually if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(25) PRIMARY KEY DEFAULT CONCAT('usr_', EXTRACT(EPOCH FROM NOW())::TEXT, '_', FLOOR(RANDOM() * 1000)::TEXT),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          "firstName" VARCHAR(100),
          "lastName" VARCHAR(100),
          role VARCHAR(20) DEFAULT 'USER',
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          "lastLoginAt" TIMESTAMP
        )
      `;
      console.log('Users table created/verified');
    } catch (error) {
      console.log('Error creating users table:', error.message);
    }

    // Try to create refresh tokens table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id VARCHAR(25) PRIMARY KEY DEFAULT CONCAT('tkn_', EXTRACT(EPOCH FROM NOW())::TEXT, '_', FLOOR(RANDOM() * 1000)::TEXT),
          token VARCHAR(500) UNIQUE NOT NULL,
          "userId" VARCHAR(25) NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      console.log('Refresh tokens table created/verified');
    } catch (error) {
      console.log('Error creating refresh tokens table:', error.message);
    }

    // Try to create a test user
    try {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await prisma.$executeRaw`
        INSERT INTO users (id, email, username, password, "firstName", "lastName", role)
        VALUES (
          CONCAT('usr_', EXTRACT(EPOCH FROM NOW())::TEXT, '_', FLOOR(RANDOM() * 1000)::TEXT),
          'admin@turnfix.com',
          'admin',
          ${hashedPassword},
          'Admin',
          'User',
          'ADMIN'
        )
        ON CONFLICT (email) DO NOTHING
      `;
      console.log('Test admin user created/verified');
    } catch (error) {
      console.log('Error creating test user:', error.message);
    }

    console.log('\n=== Database setup complete! ===');
    console.log('Test credentials:');
    console.log('Email: admin@turnfix.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Database setup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
