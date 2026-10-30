/**
 * IBE Student Learning Hub — Direct External Courses and Certificates
 * Type definitions for providers, subjects, course catalog, and student learning records.
 */

export type LearningProviderId =
  | "HP_LIFE"
  | "SAYLOR_UNIVERSITY"
  | "HUBSPOT_ACADEMY"
  | "OPENLEARN"
  | "SANTANDER_OPEN_ACADEMY"
  | "ALISON";

export type IbeSubjectCategory =
  | "Entrepreneurship and Business Planning"
  | "Managerial Accounting"
  | "Financial Accounting and Financial Statements"
  | "Income Taxation and Bookkeeping"
  | "Personal Finance"
  | "Recruitment and Selection"
  | "Human Resources Management"
  | "Organizational Development"
  | "Marketing and Selling Online"
  | "Business Administration"
  | "Inventory Management and Business Operations"
  | "Digital Skills and Professional Development";

export type CourseLinkType =
  | "VERIFIED_COURSE"
  | "PROVIDER_CATEGORY"
  | "PROVIDER_HOMEPAGE";

export type CertificateAvailability =
  | "FREE_VERIFIED"
  | "PAID_OR_CONDITIONAL"
  | "UNVERIFIED";

export type CoursePricingStatus =
  | "FREE"
  | "FREE_LEARNING_PAID_CERT"
  | "UNVERIFIED";

export type LearningRecordStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

export type VerificationType = "SELF_REPORTED";

export interface LearningProvider {
  id: LearningProviderId;
  name: string;
  shortName: string;
  homepageUrl: string;
  catalogUrl: string;
  description: string;
  certificatePolicyNote: string;
  badgeColor: string;
}

export interface ExternalCourseEntry {
  id: string;
  title: string;
  providerId: LearningProviderId;
  providerName: string;
  subject: IbeSubjectCategory;
  description: string;
  /** Official destination URL (individual course page, category/search page, or homepage). */
  officialUrl: string;
  /** Fallback official provider catalog/homepage URL if the direct URL ever becomes unavailable. */
  fallbackUrl: string;
  /** Distinguishes verified individual course URLs from category/search pages or homepages. */
  linkType: CourseLinkType;
  /** Verified duration label (null when not officially verified). */
  durationLabel: string | null;
  /** Approximate duration in minutes for sorting when verified (null when unverified). */
  durationMinutes: number | null;
  /** Verified learning format (null when not verified). */
  learningFormat: string | null;
  /** Certificate availability classification. */
  certificateAvailability: CertificateAvailability;
  /** Human-readable explanation of certificate conditions or unverified status. */
  certificateConditionLabel: string;
  /** Pricing classification when verified. */
  pricingStatus: CoursePricingStatus;
  /** Human-readable pricing status label. */
  pricingLabel: string;
  /** Whether this entry was part of the initial researched seed list from the specification. */
  isInitialSeed: boolean;
  /** Search keywords for fast discovery. */
  keywords: string[];
}

export interface StudentLearningRecord {
  id: string;
  studentId: string;
  instituteId: string;
  courseId: string;
  status: LearningRecordStatus;
  completedAt: string | null;
  certificateUrl: string;
  notes: string;
  verificationType: VerificationType;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningRecordInput {
  courseId: string;
  status?: LearningRecordStatus;
  completedAt?: string | null;
  certificateUrl?: string;
  notes?: string;
  markOpened?: boolean;
}

