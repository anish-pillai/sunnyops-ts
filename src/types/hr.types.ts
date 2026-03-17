export type RecruitmentStage =
  | 'Screening'
  | 'Interview'
  | 'Offer Sent'
  | 'Joined'
  | 'Not Selected';

export type LetterType = 'LET' | 'OFR';

export interface InterviewRound {
  round_name: string;
  date?: string;
  conducted_by?: string;
  venue?: string;
  verdict?: 'Passed' | 'Failed' | 'Pending';
  notes?: string;
}

export interface Applicant {
  id: string;
  name: string;
  phone?: string;
  trade?: string;
  site?: string;
  source?: string;
  stage: RecruitmentStage;
  certification?: string;
  previous_employer?: string;
  aadhar?: string;
  offer_letter_ref?: string;
  address?: string;
  experience?: string;
  interview_rounds: InterviewRound[];
  created_at: string;
  updated_at?: string;
  updated_by?: string;
}

export interface OfferLetterData {
  emp_name?: string;
  designation?: string;
  department?: string;
  site?: string;
  doj?: string;
  basic?: string;
  hra?: string;
  conv?: string;
  special?: string;
  gross?: string;
  pf_emp?: string;
  esi_emp?: string;
  net?: string;
}

export interface Letter {
  id: string;
  ref_no: string;
  type: LetterType;
  firm?: string;
  to_name: string;
  to_designation?: string;
  to_company?: string;
  to_address?: string;
  subject?: string;
  body?: string;
  site?: string;
  status: 'Draft' | 'Issued';
  ofr_data?: string | OfferLetterData | null;
  signed_by?: string;
  signed_desig?: string;
  signed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
}
