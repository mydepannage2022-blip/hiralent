# Production Database Migration Guide

## **Step 1: Environment Variables Check**

Production `.env` file mein yeh variables hone chahiye:

```bash
# Database Connection
DATABASE_URL="postgresql://username:password@host:port/database_name"

# AI Services
OPENAI_API_KEY=your_openai_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
PINECONE_INDEX_NAME=talenta-candidates

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your_key...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email
```

## **Step 2: Production Migration Commands**

### **Method A: Direct Migration (Recommended)**
```bash
# 1. Generate latest Prisma client
npx prisma generate

# 2. Deploy migrations to production database
npx prisma migrate deploy

# 3. Verify database tables created
npx prisma db pull
```

### **Method B: If First Time Setup**
```bash
# 1. Push schema directly to production (no migration history needed)
npx prisma db push

# 2. Generate client
npx prisma generate
```

## **Step 3: Verification Commands**

```bash
# Check if all tables created successfully
npx prisma studio
# OR
npx prisma db seed --preview-feature  # if you have seed data
```

## **Step 4: Test Database Connection**

```bash
# Run a simple connectivity test
node -e "
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
prisma.user.findFirst().then(() => {
  console.log('✅ Database connected successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});
"
```

## **Step 5: Start Application**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## **Troubleshooting Common Issues**

### **Issue 1: Migration Lock**
```bash
# If migration gets stuck
npx prisma migrate reset --force  # ⚠️ Only in development
# OR
npx prisma migrate resolve --rolled-back "migration_name"
```

### **Issue 2: Schema Conflicts**
```bash
# Reset and recreate
npx prisma db push --force-reset  # ⚠️ Will delete data
```

### **Issue 3: Permission Issues**
- Ensure database user has CREATE, ALTER, DROP permissions
- Check PostgreSQL connection limits

## **New Tables That Will Be Created:**

1. `CandidateDocument` - CV storage
2. `CandidateSkill` - AI extracted skills  
3. `SkillExtraction` - Processing status
4. `CareerPrediction` - AI predictions
5. `JobRecommendation` - Job matches
6. `CandidateVector` - Embeddings
7. `JobVector` - Job embeddings
8. `ProfileCompleteness` - Scoring

## **After Migration Success:**

```bash
# Verify new endpoints work
curl http://localhost:3000/api/candidate/health
```

**⚠️ Important:** Always backup production database before running migrations!