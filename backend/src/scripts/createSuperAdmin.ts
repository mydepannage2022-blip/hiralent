import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  const email = 'admin@hiralent.com'; 
  const password = 'hiralent1234@'; 
  const full_name = 'Super Admin';
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const admin = await prisma.user.create({
    data: {
      email,
      password_hash: hashedPassword,
      full_name,
      role: 'superadmin',
      is_email_verified: true
    }
  });
  
  console.log(' Super admin created:', admin.email);
  console.log('User ID:', admin.user_id);
}

createSuperAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
