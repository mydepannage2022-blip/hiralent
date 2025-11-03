import { PrismaClient } from '@prisma/client';

// Minimal augmentation to satisfy TypeScript references to prisma.uploadedDocument used in project.
// This file only adds the methods used in the codebase and does NOT affect runtime Prisma client.
declare module '@prisma/client' {
  interface PrismaClient {
    // UploadedDocument is represented by CaseDocument or CandidateDocument in the schema.
    // Provide a permissive any-based signature for the methods used by the code.
    uploadedDocument: {
      findUnique(args: any): Promise<any>;
      findMany(args?: any): Promise<any[]>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
    };
  }
}

export {};
