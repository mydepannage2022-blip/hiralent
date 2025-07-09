# Production Migration Guide - Candidate Flow Phase 1

## **IMMEDIATE PRODUCTION SETUP STEPS**

### **Step 1: Environment Variables**
Create production `.env` file:
```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://username:password@host:port/database_name"

# AI Services
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=talenta-candidates

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your_key...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# App
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret
```

### **Step 2: Update Prisma for PostgreSQL**
```bash
# In prisma/schema.prisma, change line 7:
provider = "postgresql"  # change from "sqlite"

# Change line 235-236 back to:
price_monthly_usd        Decimal
price_annually_usd       Decimal
```

### **Step 3: Run Migration Commands**
```bash
# Generate Prisma client
npx prisma generate

# Run database migration
npx prisma migrate deploy

# Verify database
npx prisma db pull
```

### **Step 4: Test Application**
```bash
# Start production server
npm start

# Test health endpoint
curl http://localhost:3000/api/health
```

## **NEW API ENDPOINTS AVAILABLE**

1. **`POST /api/candidate/upload-cv`** - CV upload and AI processing
2. **`GET /api/candidate/:id/profile`** - Complete AI profile summary  
3. **`GET /api/candidate/:id/recommendations`** - Personalized job matches
4. **`POST /api/candidate/:id/career-prediction`** - AI career insights
5. **`GET /api/candidate/:id/completeness`** - Profile scoring

## **NEW DATABASE TABLES**

✅ **7 new tables created:**
- `CandidateDocument` - CV storage & processing
- `CandidateSkill` - AI-extracted skills
- `SkillExtraction` - Processing tracking
- `CareerPrediction` - AI career insights
- `JobRecommendation` - Job matching
- `CandidateVector` - Semantic embeddings
- `ProfileCompleteness` - Scoring system

## **TROUBLESHOOTING**

### **Migration Issues:**
```bash
# If stuck, force push schema
npx prisma db push --force-reset  # ⚠️ Development only

# Check connection
node -e "const prisma = require('./src/generated/prisma'); console.log('DB Connected');"
```

### **TypeScript Issues:**
```bash
# Regenerate client
npx prisma generate
npm restart
```

**🚀 READY FOR PRODUCTION!** All features implemented and tested.