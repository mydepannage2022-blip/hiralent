// services/candidate/profile/event.service.ts

import prisma from '../../../lib/prisma';
import { ProfileEventPayload, ServiceResponse } from '../../../types/profile.types';


export class EventService {
  async logEvent(payload: ProfileEventPayload): Promise<ServiceResponse> {
    try {
      await prisma.profileEvent.create({
        data: {
          candidate_id: payload.candidate_id,
          event_type: payload.event_type,
          event_data: payload.event_data,
          timestamp: payload.timestamp ?? new Date(),
        },
      });

      return { success: true, message: 'Event logged' };
    } catch (error: any) {
      console.error('EventService.logEvent error:', error);
      return { success: false, message: 'Failed to log event', error: error.message };
    }
  }
}

export const eventService = new EventService();