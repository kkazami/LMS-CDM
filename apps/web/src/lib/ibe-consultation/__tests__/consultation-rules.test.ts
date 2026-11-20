import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessAppointment,
  checkIbeConsultationEligibility,
  computeAvailableSlotsForDate,
  findConflictingAppointment,
  findOverlappingAvailability,
  manilaDateTimeToUtc,
  validateAvailabilityInput,
  validateConsultationAttachmentBytes,
  validateStatusTransition,
} from "../rules";
import type { InstructorAvailabilityDTO } from "../types";

describe("IBE Consultation & Appointment Scheduling — Domain & Security Rules", () => {
  it("allows IBE students (BSBA HRM and BS ENTREP) and IBE instructors while rejecting non-IBE institutes and admins", () => {
    const hrmStudent = checkIbeConsultationEligibility({
      instituteCode: "IBE",
      role: "STUDENT",
      isActive: true,
    });
    assert.equal(hrmStudent.eligible, true);
    if (hrmStudent.eligible) {
      assert.equal(hrmStudent.role, "STUDENT");
    }

    const ibeProfessor = checkIbeConsultationEligibility({
      instituteCode: "ibe",
      role: "PROFESSOR",
      isActive: true,
    });
    assert.equal(ibeProfessor.eligible, true);
    if (ibeProfessor.eligible) {
      assert.equal(ibeProfessor.role, "INSTRUCTOR");
    }

    const icsStudent = checkIbeConsultationEligibility({
      instituteCode: "ICS",
      role: "STUDENT",
      isActive: true,
    });
    assert.equal(icsStudent.eligible, false);

    const iteInstructor = checkIbeConsultationEligibility({
      instituteCode: "ITE",
      role: "TEACHER",
      isActive: true,
    });
    assert.equal(iteInstructor.eligible, false);

    const ibeAdmin = checkIbeConsultationEligibility({
      instituteCode: "IBE",
      role: "ADMIN",
      isActive: true,
    });
    assert.equal(ibeAdmin.eligible, false);
  });

  it("validates instructor availability settings and prevents overlapping periods on the same day", () => {
    const valid = validateAvailabilityInput({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "11:00",
      slotDuration: 30,
      maxAppointmentsPerDay: 4,
      meetingType: "BOTH",
      location: "IBE Room 202",
    });
    assert.equal(valid.ok, true);

    const invalidDuration = validateAvailabilityInput({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "11:00",
      slotDuration: 45,
      maxAppointmentsPerDay: 4,
      meetingType: "BOTH",
      location: "IBE Room 202",
    });
    assert.equal(invalidDuration.ok, false);

    const existing: InstructorAvailabilityDTO[] = [
      {
        id: "avail-1",
        instructorId: "inst-1",
        dayOfWeek: 1,
        dayName: "Monday",
        startTime: "09:00",
        endTime: "11:00",
        slotDuration: 30,
        maxAppointmentsPerDay: 4,
        meetingType: "BOTH",
        location: "IBE Room 202",
        meetingLink: "",
        isActive: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const overlap = findOverlappingAvailability(
      {
        dayOfWeek: 1,
        startTime: "10:30",
        endTime: "12:00",
      },
      existing,
    );
    assert.notEqual(overlap, null);

    const nonOverlapSameDay = findOverlappingAvailability(
      {
        dayOfWeek: 1,
        startTime: "13:00",
        endTime: "15:00",
      },
      existing,
    );
    assert.equal(nonOverlapSameDay, null);
  });

  it("generates consultation time slots and marks conflicting or blocked slots unavailable", () => {
    // 2027-03-08 is a Monday (dayOfWeek = 1)
    const dateKey = "2027-03-08";
    const availabilities: InstructorAvailabilityDTO[] = [
      {
        id: "avail-mon",
        instructorId: "inst-1",
        dayOfWeek: 1,
        dayName: "Monday",
        startTime: "09:00",
        endTime: "10:00",
        slotDuration: 30,
        maxAppointmentsPerDay: 4,
        meetingType: "BOTH",
        location: "IBE Room 204",
        meetingLink: "https://meet.example.com/ibe",
        isActive: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const bookedStart = manilaDateTimeToUtc(dateKey, "09:00");
    const bookedEnd = manilaDateTimeToUtc(dateKey, "09:30");
    const now = manilaDateTimeToUtc("2027-03-01", "08:00");

    const slots = computeAvailableSlotsForDate({
      dateKey,
      availabilities,
      blockedDates: [],
      existingAppointments: [
        {
          id: "appt-booked",
          status: "APPROVED",
          requestedStartAt: bookedStart,
          requestedEndAt: bookedEnd,
          proposedStartAt: null,
          proposedEndAt: null,
        },
      ],
      now,
    });

    assert.equal(slots.length, 2);
    assert.equal(slots[0].isAvailable, false);
    assert.equal(slots[0].unavailableReason, "Already booked");
    assert.equal(slots[1].isAvailable, true);
  });

  it("prevents double-booked appointments via conflict detection", () => {
    const startA = new Date("2027-04-12T01:00:00.000Z");
    const endA = new Date("2027-04-12T01:30:00.000Z");

    const conflict = findConflictingAppointment(
      new Date("2027-04-12T01:15:00.000Z"),
      new Date("2027-04-12T01:45:00.000Z"),
      [
        {
          id: "appt-1",
          status: "CONFIRMED",
          requestedStartAt: startA,
          requestedEndAt: endA,
          proposedStartAt: null,
          proposedEndAt: null,
        },
      ],
    );
    assert.notEqual(conflict, null);
    assert.equal(conflict?.id, "appt-1");
  });

  it("validates PDF, DOC, and DOCX attachments by size, extension, and magic bytes while rejecting invalid files", () => {
    const validPdf = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
    ]);
    const pdfCheck = validateConsultationAttachmentBytes(
      validPdf,
      "Consultation_Letter.pdf",
      "application/pdf",
    );
    assert.equal(pdfCheck.ok, true);

    const docxXmlMarker = Buffer.from("PK\x03\x04\x14\x00\x06\x00[Content_Types].xml", "latin1");
    const validDocx = new Uint8Array(docxXmlMarker);
    const docxCheck = validateConsultationAttachmentBytes(
      validDocx,
      "Supporting_Document.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    assert.equal(docxCheck.ok, true);

    const validDoc = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
    ]);
    const docCheck = validateConsultationAttachmentBytes(
      validDoc,
      "Formal_Request.doc",
      "application/msword",
    );
    assert.equal(docCheck.ok, true);

    const spoofedExe = new Uint8Array([
      0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
    ]);
    const spoofedCheck = validateConsultationAttachmentBytes(
      spoofedExe,
      "malicious.pdf",
      "application/pdf",
    );
    assert.equal(spoofedCheck.ok, false);

    const badExtension = validateConsultationAttachmentBytes(
      validPdf,
      "script.exe",
      "application/octet-stream",
    );
    assert.equal(badExtension.ok, false);
  });

  it("enforces valid appointment status transitions and preserves NO_SHOW attendance outcome", () => {
    // 1. Instructor approves PENDING -> APPROVED
    const approveRes = validateStatusTransition({
      currentStatus: "PENDING",
      actorRole: "INSTRUCTOR",
      action: "APPROVE",
    });
    assert.equal(approveRes.ok, true);
    if (approveRes.ok) {
      assert.equal(approveRes.nextStatus, "APPROVED");
    }

    // 2. Instructor rejects without reason -> fails
    const rejectNoReason = validateStatusTransition({
      currentStatus: "PENDING",
      actorRole: "INSTRUCTOR",
      action: "REJECT",
      rejectionReason: "",
    });
    assert.equal(rejectNoReason.ok, false);

    // 3. Instructor rejects with reason -> REJECTED
    const rejectWithReason = validateStatusTransition({
      currentStatus: "PENDING",
      actorRole: "INSTRUCTOR",
      action: "REJECT",
      rejectionReason: "Departmental faculty board meeting during this slot.",
    });
    assert.equal(rejectWithReason.ok, true);
    if (rejectWithReason.ok) {
      assert.equal(rejectWithReason.nextStatus, "REJECTED");
    }

    // 4. Instructor proposes reschedule -> RESCHEDULE_REQUESTED
    const proposeRes = validateStatusTransition({
      currentStatus: "PENDING",
      actorRole: "INSTRUCTOR",
      action: "PROPOSE_RESCHEDULE",
      proposedStartAt: new Date("2027-05-10T02:00:00.000Z"),
      proposedEndAt: new Date("2027-05-10T02:30:00.000Z"),
    });
    assert.equal(proposeRes.ok, true);
    if (proposeRes.ok) {
      assert.equal(proposeRes.nextStatus, "RESCHEDULE_REQUESTED");
    }

    // 5. Instructor can also approve directly from RESCHEDULE_REQUESTED -> APPROVED
    const approveFromReschedule = validateStatusTransition({
      currentStatus: "RESCHEDULE_REQUESTED",
      actorRole: "INSTRUCTOR",
      action: "APPROVE",
    });
    assert.equal(approveFromReschedule.ok, true);
    if (approveFromReschedule.ok) {
      assert.equal(approveFromReschedule.nextStatus, "APPROVED");
    }

    // 6. Student explicitly accepts proposed schedule -> CONFIRMED
    const studentAccept = validateStatusTransition({
      currentStatus: "RESCHEDULE_REQUESTED",
      actorRole: "STUDENT",
      action: "ACCEPT_RESCHEDULE",
    });
    assert.equal(studentAccept.ok, true);
    if (studentAccept.ok) {
      assert.equal(studentAccept.nextStatus, "CONFIRMED");
    }

    // 6. Instructor marks consultation as NO_SHOW -> preserves attendanceOutcome: "NO_SHOW"
    const noShowRes = validateStatusTransition({
      currentStatus: "CONFIRMED",
      actorRole: "INSTRUCTOR",
      action: "MARK_NO_SHOW",
    });
    assert.equal(noShowRes.ok, true);
    if (noShowRes.ok) {
      assert.equal(noShowRes.nextStatus, "COMPLETED");
      assert.equal(noShowRes.attendanceOutcome, "NO_SHOW");
    }
  });

  it("restricts appointment viewing and document access strictly to the owning student or assigned instructor", () => {
    const appt = { studentId: "student-1", instructorId: "instructor-1" };
    assert.equal(
      canAccessAppointment(
        { userId: "student-1", role: "STUDENT", instituteCode: "ibe" },
        appt,
      ),
      true,
    );
    assert.equal(
      canAccessAppointment(
        { userId: "instructor-1", role: "INSTRUCTOR", instituteCode: "ibe" },
        appt,
      ),
      true,
    );
    assert.equal(
      canAccessAppointment(
        { userId: "student-2", role: "STUDENT", instituteCode: "ibe" },
        appt,
      ),
      false,
    );
    assert.equal(
      canAccessAppointment(
        { userId: "instructor-2", role: "INSTRUCTOR", instituteCode: "ibe" },
        appt,
      ),
      false,
    );
    assert.equal(
      canAccessAppointment(
        { userId: "student-1", role: "STUDENT", instituteCode: "ics" },
        appt,
      ),
      false,
    );
  });
});
