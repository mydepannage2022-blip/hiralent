import { PrismaClient } from '@prisma/client';
import { ProfileCompletenessResult } from '../../../types/profile.types';

const prisma = new PrismaClient();

export class CompletenessService {
  
  /**
   * Calculate profile completeness for a candidate
   * Returns scores for each section and overall completeness
   */
  async calculateCompleteness(candidateId: string): Promise<ProfileCompletenessResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: candidateId },
        include: {
          candidateProfile: true,
          candidateSkills: true,
          candidateDocuments: true,
          certifications: true
        }
      });

      if (!user) {
        throw new Error('Candidate not found');
      }

      const profile = user.candidateProfile;
      const missing_fields: string[] = [];
      const suggestions: string[] = [];

      // ==================== BASIC INFO SCORE (20 points) ====================
      let basic_info_score = 0;
      
      // Name and email (always present due to registration)
      if (user.full_name) basic_info_score += 5;
      if (user.email) basic_info_score += 5;
      
      // Phone number
      if (user.phone_number) {
        basic_info_score += 2.5;
      } else {
        missing_fields.push('phone_number');
        suggestions.push('Ajoutez votre numéro de téléphone');
      }
      
      // Profile picture
      if (profile?.profile_picture_url) {
        basic_info_score += 2.5;
      } else {
        missing_fields.push('profile_picture');
        suggestions.push('Ajoutez une photo de profil professionnelle');
      }
      
      // Headline
      if (profile?.headline) {
        basic_info_score += 2.5;
      } else {
        missing_fields.push('headline');
        suggestions.push('Ajoutez un titre professionnel (ex: "Full Stack Developer")');
      }
      
      // About me
      if (profile?.about_me && profile.about_me.length >= 50) {
        basic_info_score += 2.5;
      } else {
        missing_fields.push('about_me');
        suggestions.push('Rédigez une description "À propos de moi" (minimum 50 caractères)');
      }

      // ==================== SKILLS SCORE (30 points) ====================
      const skillCount = user.candidateSkills.length;
      let skills_score = 0;
      
      if (skillCount === 0) {
        missing_fields.push('skills');
        suggestions.push('Ajoutez au moins 3 compétences à votre profil');
      } else if (skillCount < 3) {
        skills_score = skillCount * 5; // 5 points per skill
        suggestions.push(`Ajoutez ${3 - skillCount} compétence(s) supplémentaire(s)`);
      } else {
        // Base score: 5 points per skill (max 20 points for 4+ skills)
        skills_score = Math.min(skillCount * 5, 20);
        
        // Bonus: 10 points for having verified skills
        const verifiedSkills = user.candidateSkills.filter(s => s.is_verified);
        if (verifiedSkills.length > 0) {
          skills_score += 10;
        } else {
          suggestions.push('Validez vos compétences en passant des assessments');
        }
      }
      
      skills_score = Math.min(skills_score, 30);

      // ==================== EXPERIENCE SCORE (20 points) ====================
      let experience_score = 0;
      
      if (!profile?.experience || profile.experience === '[]' || profile.experience.length === 0) {
        missing_fields.push('experience');
        suggestions.push('Ajoutez votre expérience professionnelle');
      } else {
        try {
          const experiences = typeof profile.experience === 'string' 
            ? JSON.parse(profile.experience) 
            : profile.experience;
          
          if (Array.isArray(experiences) && experiences.length > 0) {
            // 10 points per experience (max 20 for 2+ experiences)
            experience_score = Math.min(experiences.length * 10, 20);
          } else {
            missing_fields.push('experience');
            suggestions.push('Ajoutez votre expérience professionnelle');
          }
        } catch (e) {
          missing_fields.push('experience');
          suggestions.push('Ajoutez votre expérience professionnelle');
        }
      }

      // ==================== EDUCATION SCORE (15 points) ====================
      let education_score = 0;
      
      if (!profile?.education || profile.education === '[]' || profile.education.length === 0) {
        missing_fields.push('education');
        suggestions.push('Ajoutez votre formation académique');
      } else {
        try {
          const education = typeof profile.education === 'string' 
            ? JSON.parse(profile.education) 
            : profile.education;
          
          if (Array.isArray(education) && education.length > 0) {
            education_score = 15;
          } else {
            missing_fields.push('education');
            suggestions.push('Ajoutez votre formation académique');
          }
        } catch (e) {
          missing_fields.push('education');
          suggestions.push('Ajoutez votre formation académique');
        }
      }

      // ==================== DOCUMENT SCORE (15 points) ====================
      const hasCV = user.candidateDocuments.some(
        doc => doc.file_type.includes('pdf') || 
               doc.file_type.includes('doc') ||
               doc.file_type.includes('application/pdf') ||
               doc.file_type.includes('application/msword')
      );
      
      let document_score = hasCV ? 15 : 0;
      
      if (!hasCV) {
        missing_fields.push('resume');
        suggestions.push('Téléchargez votre CV (PDF ou DOC)');
      }

      // ==================== CALCULATE OVERALL SCORE ====================
      const overall_score = Math.round(
        basic_info_score + 
        skills_score + 
        experience_score + 
        education_score + 
        document_score
      );

      // ==================== SAVE TO DATABASE ====================
      const completenessData = {
        candidate_id: candidateId,
        overall_score,
        basic_info_score,
        skills_score,
        experience_score,
        education_score,
        document_score,
        profile_picture_score: profile?.profile_picture_url ? 5 : 0,
        headline_score: profile?.headline ? 5 : 0,
        missing_fields: JSON.stringify(missing_fields),
        suggestions: JSON.stringify(suggestions),
        last_calculated: new Date()
      };

      await prisma.profileCompleteness.upsert({
        where: { candidate_id: candidateId },
        update: completenessData,
        create: completenessData
      });

      console.log(`✅ Completeness calculated for ${candidateId}: ${overall_score}%`);

      return {
        overall_score,
        basic_info_score,
        skills_score,
        experience_score,
        education_score,
        document_score,
        profile_picture_score: profile?.profile_picture_url ? 5 : 0,
        headline_score: profile?.headline ? 5 : 0,
        missing_fields,
        suggestions
      };
    } catch (error: any) {
      console.error('Error calculating completeness:', error);
      throw new Error(`Failed to calculate completeness: ${error.message}`);
    }
  }

  /**
   * Get cached completeness from database
   */
  async getCompleteness(candidateId: string): Promise<ProfileCompletenessResult | null> {
    try {
      const completeness = await prisma.profileCompleteness.findUnique({
        where: { candidate_id: candidateId }
      });

      if (!completeness) {
        return null;
      }

      return {
        overall_score: completeness.overall_score,
        basic_info_score: completeness.basic_info_score,
        skills_score: completeness.skills_score,
        experience_score: completeness.experience_score,
        education_score: completeness.education_score,
        document_score: completeness.document_score,
        profile_picture_score: completeness.profile_picture_score,
        headline_score: completeness.headline_score,
        missing_fields: typeof completeness.missing_fields === 'string' 
          ? JSON.parse(completeness.missing_fields) 
          : completeness.missing_fields,
        suggestions: typeof completeness.suggestions === 'string' 
          ? JSON.parse(completeness.suggestions) 
          : completeness.suggestions
      };
    } catch (error: any) {
      console.error('Error getting completeness:', error);
      throw new Error(`Failed to get completeness: ${error.message}`);
    }
  }

  /**
   * Check if candidate can apply to jobs
   * Requires minimum completeness thresholds
   */
  async canApplyToJob(candidateId: string): Promise<{ 
    can_apply: boolean; 
    reason?: string;
    missing_requirements?: string[];
  }> {
    try {
      const completeness = await this.calculateCompleteness(candidateId);
      
      const missing_requirements: string[] = [];

      // Minimum requirements to apply
      if (completeness.basic_info_score < 15) {
        missing_requirements.push('Complete basic information (name, email, phone, photo)');
      }

      if (completeness.skills_score < 10) {
        missing_requirements.push('Add at least 3 skills to your profile');
      }

      if (completeness.document_score < 15) {
        missing_requirements.push('Upload your CV');
      }

      const can_apply = missing_requirements.length === 0;

      return {
        can_apply,
        reason: can_apply 
          ? 'Profile meets minimum requirements' 
          : 'Profile does not meet minimum requirements',
        missing_requirements: can_apply ? undefined : missing_requirements
      };
    } catch (error: any) {
      console.error('Error checking apply eligibility:', error);
      throw new Error(`Failed to check eligibility: ${error.message}`);
    }
  }

  /**
   * Get profile readiness status
   */
  async getProfileReadiness(candidateId: string): Promise<{
    is_ready: boolean;
    completeness: number;
    status: 'incomplete' | 'basic' | 'complete' | 'excellent';
    next_steps: string[];
  }> {
    try {
      const completeness = await this.calculateCompleteness(candidateId);
      
      let status: 'incomplete' | 'basic' | 'complete' | 'excellent';
      
      if (completeness.overall_score < 40) {
        status = 'incomplete';
      } else if (completeness.overall_score < 70) {
        status = 'basic';
      } else if (completeness.overall_score < 90) {
        status = 'complete';
      } else {
        status = 'excellent';
      }

      const is_ready = completeness.overall_score >= 70;

      return {
        is_ready,
        completeness: completeness.overall_score,
        status,
        next_steps: completeness.suggestions.slice(0, 3) // Top 3 suggestions
      };
    } catch (error: any) {
      console.error('Error getting profile readiness:', error);
      throw new Error(`Failed to get readiness: ${error.message}`);
    }
  }
}

// Export singleton instance
export const completenessService = new CompletenessService();