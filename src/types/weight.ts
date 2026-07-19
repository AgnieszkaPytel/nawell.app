export interface WeightSettings {
  /** ISO date (YYYY-MM-DD) when tracking starts. */
  startDate: string;
  /** Starting weight in kilograms. */
  startWeight: number;
  /** Target weight in kilograms. */
  targetWeight: number;
  /** Planned daily loss in grams (positive number). */
  dailyLossGrams: number;
  /** Optional Y-axis lower bound override (kg). */
  minWeight?: number;
  /** Optional Y-axis upper bound override (kg). */
  maxWeight?: number;
}

export interface WeightEntry {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Actual measured weight in kilograms. */
  weight: number;
  /** Optional free-text note. */
  note?: string;
  createdAt: number;
  updatedAt: number;
}
