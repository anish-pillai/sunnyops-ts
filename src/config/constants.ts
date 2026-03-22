import { colors } from '@/styles/tokens';

export const ADMIN_EMAIL = 'john@sunnyengg.com';
export const APP_VERSION = 'v2.0.0-ts';

export const COMPANY = {
  name: 'P. Sunny Engineering Contractors (OPC) Pvt. Ltd.',
  gstin: '29AAOCP5225B1ZE',
  address: 'Door No 1-144 A30, Shree Siddi Vinayaka Building',
  city: 'Mangaluru',
  state: 'Karnataka',
  state_code: '29',
  pincode: '575030',
  phone: '08246637172 / 8050196063',
  email: 'sunny@sunnyengg.com',
} as const;

export interface SiteDetail {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  state_code: string;
}

export const DEFAULT_SITE_DETAILS: SiteDetail[] = [
  { name: 'MRPL',         gstin: '29AAACM5132A1ZZ', address: 'Kutherthoor',    city: 'Mangalore',  state: 'Karnataka',     pincode: '575030', state_code: '29' },
  { name: 'MEIL',         gstin: '09AABCL2313B1Z6', address: 'Anpara',         city: 'Sonebhadra', state: 'Uttar Pradesh', pincode: '231225', state_code: '09' },
  { name: 'UPCL',         gstin: '',                address: 'Yelluru Padubidri', city: 'Udupi',   state: 'Karnataka',     pincode: '574113', state_code: '29' },
  { name: 'BTPS-Bellary', gstin: '29AAACK8032D1ZQ', address: 'Kudithini',      city: 'Bellary',    state: 'Karnataka',     pincode: '583152', state_code: '29' },
  { name: 'BHEL',         gstin: '29AAACB5765K1ZE', address: 'Kudithini',      city: 'Bellary',    state: 'Karnataka',     pincode: '583152', state_code: '29' },
  { name: 'Moxi',         gstin: '33AARCM7295H1ZV', address: 'Melamaruthur',   city: '',           state: 'Tamil Nadu',    pincode: '628105', state_code: '33' },
  { name: 'GAIL',         gstin: '',                address: '',               city: '',           state: '',              pincode: '',       state_code: ''   },
  { name: 'Head Office',  gstin: '29AAOCP5225B1ZE', address: 'Door No 1-144 A30, Shree Siddi Vinayaka Building', city: 'Mangaluru', state: 'Karnataka', pincode: '575030', state_code: '29' },
];

export const INVENTORY_CATEGORIES = [
  'PPE', 'Power Tools', 'Hand Tools', 'Lifting & Rigging',
  'Measuring Instruments', 'Safety Equipment', 'Electrical',
  'Welding Equipment', 'Civil Equipment', 'Vehicles', 'Others',
] as const;

export const STORE_CATEGORIES = [
  'PPE', 'Electrical', 'Civil', 'Welding Consumables',
  'Hardware', 'Plumbing', 'Safety', 'Stationery', 'Others',
] as const;

export const UNITS = ['Nos', 'Set', 'Pair', 'Kg', 'Ltr', 'Mtr', 'Roll', 'Box', 'Pack'] as const;

export const CONDITIONS = ['Good', 'Fair', 'Poor', 'Condemned'] as const;

export const RECRUITMENT_STAGES = [
  'Screening', 'Interview', 'Offer Sent', 'Joined', 'Not Selected',
] as const;

export const STAGE_COLOURS: Record<string, { bg: string; c: string; br: string }> = {
  'Screening':    { bg: colors.infoBg,     c: colors.info,        br: colors.infoBorder },
  'Interview':    { bg: colors.warningBg,  c: colors.warningDark, br: colors.warningBorder },
  'Offer Sent':   { bg: colors.successBg,  c: colors.successDark, br: colors.successBorder },
  'Joined':       { bg: colors.violetBg,   c: colors.violet,      br: colors.violetBorder },
  'Not Selected': { bg: colors.dangerBg,   c: colors.danger,      br: colors.dangerBorder },
};

export const PAYABLE_CATEGORIES = [
  'Labour', 'Material', 'Equipment', 'Transport',
  'Professional Services', 'Utilities', 'Others',
] as const;

// GST rates commonly used
export const GST_RATES = [0, 5, 12, 18, 28] as const;

// Our company state code for GST intra/inter state detection
export const OUR_STATE_CODE = '29'; // Karnataka

export const FIRMS = [
  { key: "opc", name: "P. Sunny Engineering Contractors (OPC) Pvt. Ltd.", short: "P. Sunny Engg (OPC)", gst: "29AAOCP5225B1ZE" },
  { key: "prop", name: "P. Sunny Engineering Contractor", short: "P. Sunny Engineering Contractor", gst: "24ASKPS0046G1ZK" },
] as const;

// ── E-Invoice Constants ──────────────────────────────────────────────

export interface EIClient {
  name: string;
  gstin: string;
  address: string;
  state: string;
  state_code: string;
}

export const EI_CLIENTS: EIClient[] = [
  { name: 'MRPL',         gstin: '29AAACM5132A1ZZ', address: 'Kutherthooru, Mangaluru, Karnataka - 575030', state: 'Karnataka',     state_code: '29' },
  { name: 'MEIL/Anpara',  gstin: '09AABCL2313B1Z6', address: 'Anpara, Sonebhadra, Uttar Pradesh - 231225',  state: 'Uttar Pradesh', state_code: '09' },
  { name: 'UPCL',         gstin: '',                 address: 'Yelluru Padubidri, Udupi, Karnataka - 574113', state: 'Karnataka',    state_code: '29' },
  { name: 'BTPS-Bellary', gstin: '29AAACK8032D1ZQ', address: 'Kudithini, Bellary, Karnataka - 583152',       state: 'Karnataka',     state_code: '29' },
  { name: 'BHEL',         gstin: '29AAACB5765K1ZE', address: 'Kudithini, Bellary, Karnataka - 583152',       state: 'Karnataka',     state_code: '29' },
  { name: 'Moxi',         gstin: '33AARCM7295H1ZV', address: 'Melamaruthur, Tamil Nadu - 628105',            state: 'Tamil Nadu',    state_code: '33' },
  { name: 'GAIL',         gstin: '',                 address: '',                                              state: '',              state_code: ''   },
  { name: 'ADANI',        gstin: '',                 address: '',                                              state: '',              state_code: ''   },
  { name: 'KPCL',         gstin: '29AAACK0610R1ZN', address: 'Bellary, Karnataka',                            state: 'Karnataka',     state_code: '29' },
];

export const EI_DEFAULT_HSN = '998719';

export const EI_HSN_CODES = [
  { code: '998719', desc: 'Maintenance, repair of other machinery & equipment (DEFAULT)' },
  { code: '995411', desc: 'Civil construction works' },
  { code: '995414', desc: 'Construction — Pipelines, Mechanical' },
  { code: '995415', desc: 'Erection & Commissioning' },
  { code: '998511', desc: 'Labour supply / manpower' },
  { code: '996713', desc: 'Cargo handling services' },
] as const;

export const EI_UNITS = ['LS', 'Job', 'MT', 'M3', 'Nos', 'RMT', 'Mtr', 'Sqm', 'Cum', 'Hrs', 'Days', '%'] as const;

export const EI_STATUSES = ['Draft', 'Submitted', 'IRN Obtained', 'Pushed to Bills', 'Cancelled'] as const;

export const EI_STATUS_COLORS: Record<string, { bg: string; c: string; br: string }> = {
  'Draft':           { bg: colors.slate100,   c: colors.slate600,  br: colors.slate300 },
  'Submitted':       { bg: colors.infoBg,     c: colors.info,      br: colors.infoBorder },
  'IRN Obtained':    { bg: colors.successBg,  c: colors.success,   br: colors.successBorder },
  'Pushed to Bills': { bg: colors.brandLight,  c: colors.brandHover, br: colors.brandBorder },
  'Cancelled':       { bg: colors.dangerBg,   c: colors.danger,    br: colors.dangerBorder },
};

// ── CN/DN Constants ──────────────────────────────────────────────────

export const CDN_STATUSES = ['Draft', 'Submitted', 'IRN Obtained', 'Cancelled'] as const;

export const CDN_STATUS_COLORS: Record<string, { bg: string; c: string; br: string }> = {
  'Draft':        { bg: colors.slate100,   c: colors.slate600,  br: colors.slate300 },
  'Submitted':    { bg: colors.infoBg,     c: colors.info,      br: colors.infoBorder },
  'IRN Obtained': { bg: colors.successBg,  c: colors.success,   br: colors.successBorder },
  'Cancelled':    { bg: colors.dangerBg,   c: colors.danger,    br: colors.dangerBorder },
};

export const CDN_REASONS = [
  'Invoice raised with wrong amount — full cancellation',
  'Partial cancellation / rate revision downward',
  'Quantity shortfall / work scope reduction',
  'Client deduction dispute — partial credit',
  'Additional charges to client (Debit Note)',
  'Price escalation / rate revision upward (Debit Note)',
  'Other',
] as const;

export const PO_STATUSES = ['Draft', 'Pending Purchase', 'Ordered', 'Received', 'Cancelled'] as const;

export const PO_STATUS_COLORS: Record<string, { bg: string; c: string; br: string }> = {
  'Draft':            { bg: colors.slate100,   c: colors.slate600,    br: colors.slate300 },
  'Pending Purchase': { bg: colors.warningBg,  c: colors.warningDark, br: colors.warningBorder },
  'Ordered':          { bg: colors.infoBg,     c: colors.info,        br: colors.infoBorder },
  'Received':         { bg: colors.successBg,  c: colors.success,     br: colors.successBorder },
  'Cancelled':        { bg: colors.dangerBg,   c: colors.danger,      br: colors.dangerBorder },
};

export const QUT_STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected'] as const;

export const QUT_COLORS: Record<string, { bg: string; c: string; br: string }> = {
  'Draft':    { bg: colors.slate100,   c: colors.slate600,  br: colors.slate300 },
  'Sent':     { bg: colors.infoBg,     c: colors.info,      br: colors.infoBorder },
  'Accepted': { bg: colors.successBg,  c: colors.success,   br: colors.successBorder },
  'Rejected': { bg: colors.dangerBg,   c: colors.danger,    br: colors.dangerBorder },
};
