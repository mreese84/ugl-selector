export interface Member {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
  year: number;
  month: number; // 1–12
  location: string;
  attendeeIds: string[];
  selectedById: string; // member who chose THIS trip's location
  nextSelectorId: string | null; // member drawn at end of this trip (null = not yet drawn)
}
