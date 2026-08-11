export type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type House = {
  id: number;
  house_number: string | null;
  name_si: string;
  name_en: string;
  address_si: string;
  address_en: string;
  village_si: string;
  village_en: string;
  telephone: string;
  notes: string;
  is_archived: number;
  custom_field_1: string;
  custom_field_2: string;
  custom_field_3: string;
  custom_field_4: string;
  custom_field_5: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
};

export type Person = {
  id: number;
  full_name_si: string;
  full_name_en: string;
  gender: string;
  birthday: string | null;
  nic: string;
  phone: string;
  occupation_si: string;
  occupation_en: string;
  relationship_in_family: string;
  address_si: string;
  address_en: string;
  notes: string;
  current_house_id: number | null;
  is_archived: number;
  /** 1 = child who attends this temple's Daham school */
  daham_school_child: number;
  custom_field_1: string;
  custom_field_2: string;
  custom_field_3: string;
  custom_field_4: string;
  custom_field_5: string;
  created_at: string;
  updated_at: string;
  house_name_si?: string;
  house_name_en?: string;
  house_number?: string | null;
};

export type HouseInput = Omit<
  House,
  "id" | "created_at" | "updated_at" | "member_count"
>;

export type PersonInput = Omit<
  Person,
  | "id"
  | "created_at"
  | "updated_at"
  | "house_name_si"
  | "house_name_en"
  | "house_number"
>;

export type PendingRequest = {
  id: number;
  request_type: string;
  payload_json: string;
  target_person_id: number | null;
  target_house_id: number | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string;
};

export type NamedType = {
  id: number;
  name_si: string;
  name_en: string;
  sort_order: number;
};

export type AttendanceRow = {
  id: number;
  person_id: number;
  house_id: number | null;
  attendance_date: string;
  event_id: number | null;
  event_other: string | null;
  notes: string;
  marked_at: string;
  person_name_si?: string;
  person_name_en?: string;
  house_name_si?: string;
  house_name_en?: string;
  event_name_si?: string;
  event_name_en?: string;
};

export type DocumentLog = {
  id: number;
  person_id: number;
  house_id: number | null;
  document_type_id: number | null;
  document_other: string | null;
  issue_date: string;
  issued_by: string;
  remarks: string;
  created_at: string;
  person_name_si?: string;
  person_name_en?: string;
  house_name_si?: string;
  house_name_en?: string;
  type_name_si?: string;
  type_name_en?: string;
};

export type DanaType = "heel" | "dawal";
export type DanaTypeSelection = DanaType | "both";

export type DanaRecurrenceType =
  | "once"
  | "monthly"
  | "every_3_months"
  | "every_6_months"
  | "annually"
  | "custom";

export type DanaRecurrenceUnit = "days" | "months" | "years";
export type DanaEndType = "never" | "until" | "count";
export type DanaOccurrenceStatus = "scheduled" | "cancelled";

export type DanaSchedule = {
  id: number;
  house_id: number;
  dana_type: DanaType;
  start_date: string;
  recurrence_type: DanaRecurrenceType;
  recurrence_interval: number;
  recurrence_unit: DanaRecurrenceUnit;
  end_type: DanaEndType;
  end_date: string | null;
  occurrence_count: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  house_number?: string | null;
  house_name_si?: string;
  house_name_en?: string;
};

export type DanaOccurrence = {
  id: number;
  schedule_id: number | null;
  house_id: number;
  dana_type: DanaType;
  dana_date: string;
  status: DanaOccurrenceStatus;
  created_at: string;
  updated_at: string;
  house_number?: string | null;
  house_name_si?: string;
  house_name_en?: string;
  schedule_active?: number | null;
};

export type DanaMonthDaySummary = {
  date: string;
  heel_count: number;
  dawal_count: number;
  heel_houses: string[];
  dawal_houses: string[];
};

export type DanaDateGroup = {
  date: string;
  heel: DanaOccurrence[];
  dawal: DanaOccurrence[];
};

export type DanaHouseHistory = {
  past: DanaOccurrence[];
  upcoming: DanaOccurrence[];
  schedules: DanaSchedule[];
};

export type DanaCreateInput = {
  houseId: number;
  danaType: DanaTypeSelection;
  startDate: string;
  recurrenceType: DanaRecurrenceType;
  recurrenceInterval?: number;
  recurrenceUnit?: DanaRecurrenceUnit;
  endType?: DanaEndType;
  endDate?: string | null;
  occurrenceCount?: number | null;
};

export type DanaUpdateScheduleInput = {
  startDate?: string;
  recurrenceType?: DanaRecurrenceType;
  recurrenceInterval?: number;
  recurrenceUnit?: DanaRecurrenceUnit;
  endType?: DanaEndType;
  endDate?: string | null;
  occurrenceCount?: number | null;
  danaType?: DanaType;
};

/** Change a single calendar day only (does not change the recurring schedule). */
export type DanaDayUpdateInput = {
  date: string;
  houseId: number;
  danaType: DanaType;
  /** Stored row id when editing an existing occurrence (typical for past). */
  occurrenceId?: number | null;
  /**
   * Active schedule this day was computed from (typical for future).
   * That schedule date is skipped; a one-off row is written instead.
   */
  scheduleId?: number | null;
};

export type TempleEvent = {
  id: number;
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_date: string;
  end_date: string;
  color_index: number;
  created_at: string;
  updated_at: string;
};

export type TempleEventInput = {
  name_si: string;
  name_en: string;
  description_si?: string;
  description_en?: string;
  start_date: string;
  end_date: string;
  color_index?: number;
};

export type TempleTaskLocation = "inside" | "outside";

export type TempleTask = {
  id: number;
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  /** Local datetime YYYY-MM-DDTHH:MM */
  start_at: string;
  /** Local datetime YYYY-MM-DDTHH:MM */
  end_at: string;
  location_type: TempleTaskLocation;
  color_index: number;
  created_at: string;
  updated_at: string;
};

export type TempleTaskInput = {
  name_si: string;
  name_en: string;
  description_si?: string;
  description_en?: string;
  start_at: string;
  end_at: string;
  location_type: TempleTaskLocation;
  color_index?: number;
};

export type PaymentType = {
  id: number;
  name_si: string;
  name_en: string;
  amount: number;
  sort_order: number;
};

export type PaymentTypeInput = {
  id?: number;
  name_si: string;
  name_en: string;
  amount: number;
  sort_order?: number;
};

export type PaymentSubjectType = "person" | "house";

export type Payment = {
  id: number;
  subject_type: PaymentSubjectType;
  person_id: number | null;
  house_id: number | null;
  payment_type_id: number | null;
  type_name_si: string;
  type_name_en: string;
  amount: number;
  payment_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  person_name_si?: string;
  person_name_en?: string;
  house_name_si?: string;
  house_name_en?: string;
  house_number?: string | null;
};

export type PaymentInput = {
  subject_type: PaymentSubjectType;
  person_id?: number | null;
  house_id?: number | null;
  payment_type_id?: number | null;
  type_name_si?: string;
  type_name_en?: string;
  amount?: number | null;
  payment_date: string;
  notes?: string;
};

/** Front desk: no amount */
export type PaymentPublic = Omit<Payment, "amount">;

export type TempleInfoItem = {
  id: number;
  label_si: string;
  label_en: string;
  value_si: string;
  value_en: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TempleInfoInput = {
  id?: number;
  label_si: string;
  label_en: string;
  value_si?: string;
  value_en?: string;
  sort_order?: number;
};
