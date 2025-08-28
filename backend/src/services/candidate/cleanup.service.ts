import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const prisma = new PrismaClient();

// Configure Cloudinary (make sure this is configured in your main app too)
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

export const cleanupOldResume = async (candidateId: string): Promise<void> => {
  try {
    console.log(`Starting cleanup for candidate: ${candidateId}`);

    // Get all existing documents for this candidate
    const existingDocuments = await prisma.candidateDocument.findMany({
      where: { candidate_id: candidateId },
    });

    if (existingDocuments.length === 0) {
      console.log("No existing documents found - first time upload");
      return;
    }

    // Step 1: Delete old skills from CV extraction
    const deletedSkills = await prisma.candidateSkill.deleteMany({
      where: { 
        candidate_id: candidateId,
        source_type: "cv_extraction"
      },
    });
    console.log(`Deleted ${deletedSkills.count} old CV-extracted skills`);

    // Step 2: Delete old skill extraction records
    const deletedExtractions = await prisma.skillExtraction.deleteMany({
      where: { candidate_id: candidateId },
    });
    console.log(`Deleted ${deletedExtractions.count} old skill extraction records`);

    // Step 3: Delete old career predictions
    const deletedPredictions = await prisma.careerPrediction.deleteMany({
      where: { candidate_id: candidateId },
    });
    console.log(`Deleted ${deletedPredictions.count} old career predictions`);

    // Step 4: Delete old job recommendations
    const deletedRecommendations = await prisma.jobRecommendation.deleteMany({
      where: { candidate_id: candidateId },
    });
    console.log(`Deleted ${deletedRecommendations.count} old job recommendations`);

    // Step 5: Delete old candidate vectors
    const deletedVectors = await prisma.candidateVector.deleteMany({
      where: { candidate_id: candidateId },
    });
    console.log(`Deleted ${deletedVectors.count} old candidate vectors`);

    // Step 6: Delete old documents from Cloudinary
    for (const doc of existingDocuments) {
      if (doc.file_path.includes('cloudinary.com')) {
        try {
          // Extract public_id from Cloudinary URL
          // For secure_url format: https://res.cloudinary.com/cloud_name/resource_type/upload/vN/folder/public_id.ext
          const urlParts = doc.file_path.split('/');
          
          // Find the folder and filename parts
          const folderIndex = urlParts.findIndex(part => part === 'hiralent-candidate');
          if (folderIndex !== -1 && folderIndex + 2 < urlParts.length) {
            const folderName = urlParts[folderIndex] + '/' + urlParts[folderIndex + 1]; // hiralent-candidate/resumes
            const filenameWithExt = urlParts[urlParts.length - 1];
            const filename = filenameWithExt.split('.')[0]; // Remove extension
            const publicId = `${folderName}/${filename}`;
            
            console.log("Attempting to delete Cloudinary file with public_id:", publicId);
            
            const deleteResult = await cloudinary.uploader.destroy(publicId, { 
              resource_type: 'raw', 
              type: 'upload' 
            });
            
            if (deleteResult.result === 'ok') {
              console.log(`✅ Successfully deleted from Cloudinary: ${publicId}`);
            } else {
              console.warn(`⚠️ Cloudinary deletion result: ${deleteResult.result} for ${publicId}`);
            }
          } else {
            console.warn("Could not parse Cloudinary URL for deletion:", doc.file_path);
          }
        } catch (cloudinaryError) {
          console.warn("Failed to delete from Cloudinary:", cloudinaryError);
        }
      } else if (doc.file_path.startsWith('./uploads/') || doc.file_path.startsWith('uploads/')) {
        // Clean up old local files if they exist
        try {
          if (fs.existsSync(doc.file_path)) {
            fs.unlinkSync(doc.file_path);
            console.log(`Deleted local file: ${doc.file_path}`);
          }
        } catch (fileError) {
          console.warn("Failed to delete local file:", fileError);
        }
      }
    }

    // Step 7: Delete document records from database
    const deletedDocs = await prisma.candidateDocument.deleteMany({
      where: { candidate_id: candidateId },
    });
    console.log(`Deleted ${deletedDocs.count} document records from database`);

    console.log("✅ Cleanup completed successfully");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error; // Re-throw to handle in calling function
  }
};

// Additional cleanup function for profile pictures
export const cleanupOldProfilePicture = async (
  candidateId: string, 
  oldPictureUrl?: string
): Promise<void> => {
  try {
    if (!oldPictureUrl || !oldPictureUrl.includes('cloudinary.com')) {
      return;
    }

    // Extract public_id from old profile picture URL
    const urlParts = oldPictureUrl.split("/");
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `hiralent/profile-pictures/${publicIdWithExt.split(".")[0]}`;

    const deleteResult = await cloudinary.uploader.destroy(publicId);
    
    if (deleteResult.result === 'ok') {
      console.log(`✅ Old profile picture deleted from Cloudinary: ${publicId}`);
    } else {
      console.warn(`⚠️ Profile picture deletion result: ${deleteResult.result}`);
    }
  } catch (error) {
    console.warn("Failed to delete old profile picture:", error);
  }
};

// Cleanup function for temporary files
export const cleanupTempFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Temporary file cleaned up: ${filePath}`);
    }
  } catch (error) {
    console.warn(`Failed to cleanup temporary file ${filePath}:`, error);
  }
};

// Comprehensive cleanup for candidate deletion
export const cleanupCandidateData = async (candidateId: string): Promise<void> => {
  try {
    console.log(`Starting comprehensive cleanup for candidate: ${candidateId}`);

    // Get candidate profile for profile picture cleanup
    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
      select: { profile_picture_url: true }
    });

    // Cleanup resume and related data
    await cleanupOldResume(candidateId);

    // Cleanup profile picture if exists
    if (candidateProfile?.profile_picture_url) {
      await cleanupOldProfilePicture(candidateId, candidateProfile.profile_picture_url);
    }

    // Delete profile completeness
    await prisma.profileCompleteness.deleteMany({
      where: { candidate_id: candidateId }
    });

    // Delete candidate profile
    await prisma.candidateProfile.deleteMany({
      where: { candidate_id: candidateId }
    });

    console.log("✅ Comprehensive candidate cleanup completed");
  } catch (error) {
    console.error("❌ Error during comprehensive cleanup:", error);
    throw error;
  }
};


export const cleanupOldApplicationResume = async (
  candidateId: string, 
  oldApplicationResumeUrl?: string
): Promise<void> => {
  try {
    if (!oldApplicationResumeUrl || !oldApplicationResumeUrl.includes('cloudinary.com')) {
      return;
    }

    // Extract public_id from old application resume URL
    const urlParts = oldApplicationResumeUrl.split("/");
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `hiralent-candidate/application-resumes/${publicIdWithExt.split(".")[0]}`;

    console.log("Attempting to delete old application resume from Cloudinary:", publicId);
    
    const deleteResult = await cloudinary.uploader.destroy(publicId, { 
      resource_type: 'raw', 
      type: 'upload' 
    });
    
    if (deleteResult.result === 'ok') {
      console.log(`✅ Old application resume deleted from Cloudinary: ${publicId}`);
    } else {
      console.warn(`⚠️ Application resume deletion result: ${deleteResult.result}`);
    }

  } catch (error) {
    console.warn("Failed to delete old application resume:", error);
  }
};