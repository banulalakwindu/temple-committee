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
  is_active: number;
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
  is_active: number;
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
  is_active: number;
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
  type_name_si?: string;
  type_name_en?: string;
};
