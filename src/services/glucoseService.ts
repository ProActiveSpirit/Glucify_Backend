import { supabaseAdmin } from '../config/database';
import { GlucoseReading, GlucoseStats } from '../types';

export class GlucoseService {
  static async addReading(reading: Omit<GlucoseReading, 'id' | 'created_at'>): Promise<GlucoseReading | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('glucose_readings')
        .insert([reading])
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async getReadings(userId: string, limit: number = 100): Promise<GlucoseReading[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  static async getReadingsByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<GlucoseReading[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  static async getStats(userId: string, period: 'day' | 'week' | 'month'): Promise<GlucoseStats | null> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const readings = await this.getReadingsByDateRange(
        userId,
        startDate.toISOString(),
        now.toISOString()
      );

      if (readings.length === 0) {
        return null;
      }

      const values = readings.map(r => r.value);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate time in range (assuming target range 70-180 mg/dL)
      const targetRange = [70, 180] as const;
      const inRange = values.filter(val => val >= targetRange[0] && val <= targetRange[1]);
      const timeInRange = (inRange.length / values.length) * 100;

      return {
        average: Math.round(average * 10) / 10,
        min,
        max,
        timeInRange: Math.round(timeInRange * 10) / 10,
        readings: values.length,
        period
      };
    } catch (error) {
      return null;
    }
  }

  static async deleteReading(readingId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('glucose_readings')
        .delete()
        .eq('id', readingId);

      return !error;
    } catch (error) {
      return false;
    }
  }

  static async updateReading(
    readingId: string, 
    updates: Partial<GlucoseReading>
  ): Promise<GlucoseReading | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('glucose_readings')
        .update(updates)
        .eq('id', readingId)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }
} 