import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const prisma = new PrismaClient();

cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

export const cleanupOldResume = async (candidateId: string): Promise<void> => {
  try {
    const existingDocuments = await prisma.candidateDocument.findMany({
      where: { candidate_id: candidateId },
    });

    if (existingDocuments.length === 0) {
      return;
    }

    const deletedSkills = await prisma.candidateSkill.deleteMany({
      where: { 
        candidate_id: candidateId,
        source_type: "cv_extraction"
      },
    });

    const deletedExtractions = await prisma.skillExtraction.deleteMany({
      where: { candidate_id: candidateId },
    });

    const deletedPredictions = await prisma.careerPrediction.deleteMany({
      where: { candidate_id: candidateId },
    });

    const deletedRecommendations = await prisma.jobRecommendation.deleteMany({
      where: { candidate_id: candidateId },
    });

    const deletedVectors = await prisma.candidateVector.deleteMany({
      where: { candidate_id: candidateId },
    });

    for (const doc of existingDocuments) {
      if (doc.file_path.includes('cloudinary.com')) {
        try {
          const urlParts = doc.file_path.split('/');
          
          const folderIndex = urlParts.findIndex(part => part === 'hiralent-candidate');
          if (folderIndex !== -1 && folderIndex + 2 < urlParts.length) {
            const folderName = urlParts[folderIndex] + '/' + urlParts[folderIndex + 1];
            const filenameWithExt = urlParts[urlParts.length - 1];
            const filename = filenameWithExt.split('.')[0];
            const publicId = `${folderName}/${filename}`;
            
            const deleteResult = await cloudinary.uploader.destroy(publicId, { 
              resource_type: 'raw', 
              type: 'upload' 
            });
            
            if (deleteResult.result !== 'ok') {
              console.warn(`Cloudinary deletion result: ${deleteResult.result} for ${publicId}`);
            }
          } else {
            console.warn("Could not parse Cloudinary URL for deletion:", doc.file_path);
          }
        } catch (cloudinaryError) {
          console.warn("Failed to delete from Cloudinary:", cloudinaryError);
        }
      } else if (doc.file_path.startsWith('./uploads/') || doc.file_path.startsWith('uploads/')) {
        try {
          if (fs.existsSync(doc.file_path)) {
            fs.unlinkSync(doc.file_path);
          }
        } catch (fileError) {
          console.warn("Failed to delete local file:", fileError);
        }
      }
    }

    const deletedDocs = await prisma.candidateDocument.deleteMany({
      where: { candidate_id: candidateId },
    });

  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
};

export const cleanupOldProfilePicture = async (
  candidateId: string, 
  oldPictureUrl?: string
): Promise<void> => {
  try {
    if (!oldPictureUrl || !oldPictureUrl.includes('cloudinary.com')) {
      return;
    }

    const urlParts = oldPictureUrl.split("/");
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `hiralent/profile-pictures/${publicIdWithExt.split(".")[0]}`;

    const deleteResult = await cloudinary.uploader.destroy(publicId);
    
    if (deleteResult.result !== 'ok') {
      console.warn(`Profile picture deletion result: ${deleteResult.result}`);
    }
  } catch (error) {
    console.warn("Failed to delete old profile picture:", error);
  }
};

export const cleanupTempFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`Failed to cleanup temporary file ${filePath}:`, error);
  }
};

export const cleanupCandidateData = async (candidateId: string): Promise<void> => {
  try {
    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
      select: { profile_picture_url: true }
    });

    await cleanupOldResume(candidateId);

    if (candidateProfile?.profile_picture_url) {
      await cleanupOldProfilePicture(candidateId, candidateProfile.profile_picture_url);
    }

    await prisma.profileCompleteness.deleteMany({
      where: { candidate_id: candidateId }
    });

    await prisma.candidateProfile.deleteMany({
      where: { candidate_id: candidateId }
    });

  } catch (error) {
    console.error("Error during comprehensive cleanup:", error);
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

    const urlParts = oldApplicationResumeUrl.split("/");
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `hiralent-candidate/application-resumes/${publicIdWithExt.split(".")[0]}`;
    
    const deleteResult = await cloudinary.uploader.destroy(publicId, { 
      resource_type: 'raw', 
      type: 'upload' 
    });
    
    if (deleteResult.result !== 'ok') {
      console.warn(`Application resume deletion result: ${deleteResult.result}`);
    }

  } catch (error) {
    console.warn("Failed to delete old application resume:", error);
  }
};
