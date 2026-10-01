import fs from 'fs';
import path from 'path';
import {
  renderVerificationEmail,
  renderWelcomeEmail,
  renderPasswordResetEmail,
  renderNotificationEmail,
  renderMeetingEmail,
  renderInvoiceEmail,
  renderPaymentEmail,
  renderPortalInviteEmail,
  renderLeaveAppliedEmail,
  renderLeaveApprovedEmail,
  renderLeaveRejectedEmail,
  renderClientOnboardingEmail,
  renderClientCredentialsEmail,
  renderFreelancerSubmissionEmail,
  renderFreelancerApplicantEmail,
  renderNewLeadEmail
} from '../src/services/emailService.js';

const emails = [
  // 1. Client Onboarding
  {
    id: 'client-onboarding',
    category: 'Client & Portal',
    badge: 'Luxury Template',
    title: 'Client Welcome & Onboarding',
    recipient: 'Client (client@innovatex.com)',
    trigger: 'When a lead is converted to a client or a new client is created in CRM with onboarding enabled.',
    subject: 'Welcome to Rudhram, Rajesh Mehta',
    preheader: 'Your partnership begins here. Your account has been created.',
    html: renderClientOnboardingEmail({
      clientName: 'Rajesh Mehta',
      companyName: 'InnovateX Media Ltd.',
      clientId: 'C-00249',
      brand: 'damrru'
    }),
    editableFields: [
      { label: 'Subject', value: 'Welcome to Rudhram, {clientName}' },
      { label: 'Rudhram Enterprises (Default All Mails)', value: '+91 8655695623 & support@rudhramenterprises.com' },
      { label: 'Brand Contact (Damrru)', value: '+91 8655695629 & damrru@rudhramenterprises.com' },
      { label: 'Brand Emails Configured', value: 'Damrru: damrru@rudhramenterprises.com | Panigrahna: panigrahna@rudhramenterprises.com | Aghori: aghhori@rudhramenterprises.com | House of Joggi: houseofjoogi@rudhramenterprises.com | Kalyannam: kalyannam@rudhramenterprises.com | Kapaalik: kapaalik@rudhramenterprises.com | Tandavs: tandavs@rudhramenterprises.com' },
      { label: 'Brand Phones Configured', value: 'RE: 8655695623 | AG: 8655695624 | PG: 8655695625 | HG: 8655695626 | KL: 8655695627 | TD: 8655695628 | DM: 8655695629 | KP: -' },
      { label: 'Greeting', value: 'Dear {clientName},' },
      { label: 'Table Fields', value: 'Client ID, Company, Brand' },
      { label: 'Direct Support Box', value: 'Rudhram Enterprises (+91 8655695623 / support@rudhramenterprises.com) & Damrru (+91 8655695629 / damrru@rudhramenterprises.com)' }
    ]
  },
  {
    id: 'client-credentials',
    category: 'Client & Portal',
    badge: 'Credentials',
    title: 'Client Portal Login Credentials',
    recipient: 'Client (rajesh@innovatex.com)',
    trigger: 'Sent to client when portal access is created or temporary credentials are generated.',
    subject: 'Your Rudhram Portal Login Credentials',
    preheader: 'Login details for your client portal account.',
    html: renderClientCredentialsEmail({
      clientName: 'Rajesh Mehta',
      email: 'rajesh@innovatex.com',
      password: 'Rud#Secure2026!',
      portalUrl: 'https://crm.rudhram.in/portal/login',
      brand: 'damrru'
    }),
    editableFields: [
      { label: 'Subject', value: 'Your Rudhram Portal Login Credentials' },
      { label: 'Rudhram Support', value: '+91 8655695623 & support@rudhramenterprises.com' },
      { label: 'Brand Support (Damrru)', value: '+91 8655695629 & damrru@rudhramenterprises.com' },
      { label: 'Greeting', value: 'Dear {clientName},' },
      { label: 'Body', value: 'Your client portal account is ready. Use the credentials below to sign in and access your projects, invoices, and meetings.' },
      { label: 'Button CTA', value: 'Sign In to Portal' },
      { label: 'Security Warning', value: 'Important: For your security, please change your password after your first login. Go to Settings -> Change Password in the portal.' }
    ]
  },
  {
    id: 'portal-invite',
    category: 'Client & Portal',
    badge: 'Invite Link',
    title: 'Client Portal Invitation Link',
    recipient: 'Client (rajesh@innovatex.com)',
    trigger: 'When an admin clicks "Send Portal Invitation" from the client details page.',
    subject: "You're invited to the Rudhram client portal",
    preheader: "You've been invited to the Rudhram client portal. Set your password to get started.",
    html: renderPortalInviteEmail({
      portalName: 'Rudhram',
      inviteUrl: 'https://crm.rudhram.in/portal/accept-invite?token=e73bc89104fa28c'
    }),
    editableFields: [
      { label: 'Subject', value: "You're invited to the {portalName} client portal" },
      { label: 'Heading', value: 'Welcome to {portalName}' },
      { label: 'Subtext', value: "You've been invited to the {portalName} client portal. Set a password to sign in and access your projects, tasks, and meetings." },
      { label: 'Button CTA', value: 'Set your password' },
      { label: 'Expiration', value: 'This link expires in 7 days.' }
    ]
  },

  // 2. Leads & Sales
  {
    id: 'new-lead',
    category: 'Leads & Sales',
    badge: 'Internal Alert',
    title: 'New Lead Captured Alert',
    recipient: 'Admin / Sales Team (admin@rudhram.in)',
    trigger: 'When a prospective client submits an inquiry form or a lead is created.',
    subject: 'New Lead: Ananya Sharma - Damrru',
    preheader: 'New Lead: Ananya Sharma (Damrru)',
    html: renderNewLeadEmail({
      leadName: 'Ananya Sharma',
      email: 'ananya@growthlabs.io',
      phone: '+91 98765 43210',
      company: 'GrowthLabs Inc.',
      brand: 'damrru',
      source: 'Website Contact Form',
      notes: 'Interested in full corporate rebrand, podcast production, and annual social media retainers.',
      detailsUrl: 'https://crm.rudhram.in/leads/66f81a92e104'
    }),
    editableFields: [
      { label: 'Subject', value: 'New Lead: {leadName} - {brandLabel}' },
      { label: 'Heading', value: 'New Lead Captured' },
      { label: 'Subtext', value: 'A new lead has been added for {brandLabel}.' },
      { label: 'Table Fields', value: 'Name, Email, Phone, Company, Brand, Source, Notes' },
      { label: 'Button CTA', value: 'View Lead Details' }
    ]
  },

  // 3. Authentication & Security
  {
    id: 'verify-otp',
    category: 'Authentication',
    badge: 'Security OTP',
    title: 'Email Verification OTP',
    recipient: 'User / Sign-up applicant',
    trigger: 'When an employee or user signs up or requests email verification.',
    subject: 'Your Rudhram verification code: 849201',
    preheader: 'Your verification code is 849201. It expires in 10 minutes.',
    html: renderVerificationEmail('user@rudhram.in', '849201'),
    editableFields: [
      { label: 'Subject', value: 'Your Rudhram verification code: {otp}' },
      { label: 'Heading', value: 'Verify your email' },
      { label: 'Subtext', value: 'We sent this code to {email}. Enter it in the app to verify your account. The code expires in 10 minutes.' },
      { label: 'Instruction', value: 'Tap the code above — it selects itself so you can copy it in one tap — then paste it in the app.' },
      { label: 'Footer Note', value: "Didn't request this? You can safely ignore this email." }
    ]
  },
  {
    id: 'welcome-user',
    category: 'Authentication',
    badge: 'Welcome',
    title: 'Welcome to Rudhram (User Signup)',
    recipient: 'New CRM Team Member / User',
    trigger: 'When a new team member account is registered.',
    subject: 'Welcome to Rudhram',
    preheader: 'Your Rudhram account is ready. Verify your email to get started.',
    html: renderWelcomeEmail('Faizal'),
    editableFields: [
      { label: 'Subject', value: 'Welcome to Rudhram' },
      { label: 'Heading', value: 'Welcome to Rudhram' },
      { label: 'Subtext', value: 'Hi {name}, your account has been created. Verify your email to unlock everything.' },
      { label: 'Body', value: "We've sent a verification code to your inbox in a separate email. Use it to confirm your address and start managing your business." },
      { label: 'Button CTA', value: 'Sign in to Rudhram' }
    ]
  },
  {
    id: 'reset-password',
    category: 'Authentication',
    badge: 'Security Reset',
    title: 'Password Reset Request',
    recipient: 'User requesting reset',
    trigger: 'When user clicks "Forgot Password" on login screen.',
    subject: 'Reset your Rudhram password',
    preheader: 'Reset your Rudhram password. The link expires in 1 hour.',
    html: renderPasswordResetEmail('https://crm.rudhram.in/auth/reset-password?token=9f8c2b1a0d3e4'),
    editableFields: [
      { label: 'Subject', value: 'Reset your Rudhram password' },
      { label: 'Heading', value: 'Reset your password' },
      { label: 'Subtext', value: 'Click the button below to choose a new password. This link is valid for 1 hour.' },
      { label: 'Button CTA', value: 'Reset password' },
      { label: 'Footer Note', value: "If you didn't request a password reset, you can safely ignore this email." }
    ]
  },

  // 4. Meetings & Calendar
  {
    id: 'meeting-scheduled',
    category: 'Meetings',
    badge: 'Calendar Event',
    title: 'Meeting Scheduled Confirmation',
    recipient: 'Client & Team Attendees',
    trigger: 'When a meeting is scheduled in the CRM Meetings module.',
    subject: 'Meeting scheduled: Brand Strategy & Campaign Kickoff',
    preheader: 'A new meeting has been scheduled: Brand Strategy & Campaign Kickoff.',
    html: renderMeetingEmail({
      type: 'scheduled',
      title: 'Brand Strategy & Campaign Kickoff',
      date: '15 Oct 2026',
      startTime: '03:00 PM',
      endTime: '04:00 PM',
      location: 'Google Meet',
      meetingLink: 'https://meet.google.com/xyz-abcd-qrs',
      detailsUrl: 'https://crm.rudhram.in/meetings/66f81a92e104'
    }),
    editableFields: [
      { label: 'Subject', value: 'Meeting scheduled: {title}' },
      { label: 'Subtext', value: 'A new meeting has been scheduled for you.' },
      { label: 'Table Fields', value: 'Date, Time, Location, Link' },
      { label: 'Buttons', value: 'View meeting details & Direct join' },
      { label: 'Footer Note', value: 'Rudhram · Meeting notification' }
    ]
  },
  {
    id: 'meeting-reminder',
    category: 'Meetings',
    badge: '1-Hour Alert',
    title: 'Meeting 1-Hour Reminder',
    recipient: 'Meeting Attendees',
    trigger: 'Automated scheduler runs 60 minutes before scheduled meeting start.',
    subject: 'Reminder: Brand Strategy & Campaign Kickoff',
    preheader: 'Brand Strategy & Campaign Kickoff starts in 1 hour.',
    html: renderMeetingEmail({
      type: 'reminder',
      title: 'Brand Strategy & Campaign Kickoff',
      date: '15 Oct 2026',
      startTime: '03:00 PM',
      endTime: '04:00 PM',
      location: 'Google Meet',
      meetingLink: 'https://meet.google.com/xyz-abcd-qrs',
      detailsUrl: 'https://crm.rudhram.in/meetings/66f81a92e104'
    }),
    editableFields: [
      { label: 'Subject', value: 'Reminder: {title}' },
      { label: 'Subtext', value: 'Friendly reminder — this meeting starts in 1 hour.' },
      { label: 'Buttons', value: 'View meeting details & Direct join' }
    ]
  },

  // 5. Invoices & Billing
  {
    id: 'invoice-sent',
    category: 'Financials',
    badge: 'Billing & PDF',
    title: 'Invoice Sent to Client',
    recipient: 'Client Billing Contact',
    trigger: 'When an invoice is issued and sent from the Invoices module.',
    subject: 'Invoice INV-2026-0089 from Rudhram',
    preheader: 'Invoice INV-2026-0089 for ₹1,25,000 is due by 25 Oct 2026.',
    html: renderInvoiceEmail({
      clientName: 'Rajesh Mehta',
      invoiceNumber: 'INV-2026-0089',
      total: 125000,
      dueDate: '2026-10-25'
    }),
    editableFields: [
      { label: 'Subject', value: 'Invoice {invoiceNumber} from Rudhram' },
      { label: 'Heading', value: 'Invoice {invoiceNumber}' },
      { label: 'Body', value: 'Please find attached the invoice {invoiceNumber} for ₹{total}, due by {dueDate}.' },
      { label: 'Note', value: 'The PDF copy is attached to this email for your records. If you have any questions, feel free to reach out.' }
    ]
  },
  {
    id: 'payment-receipt',
    category: 'Financials',
    badge: 'Payment Receipt',
    title: 'Payment Receipt Confirmation',
    recipient: 'Client Billing Contact',
    trigger: 'When a full or partial invoice payment is recorded in CRM.',
    subject: 'Payment received: ₹1,25,000 for invoice INV-2026-0089',
    preheader: 'Payment of ₹1,25,000 received for invoice INV-2026-0089.',
    html: renderPaymentEmail({
      clientName: 'Rajesh Mehta',
      invoiceNumber: 'INV-2026-0089',
      amount: 125000,
      date: '2026-10-18',
      outstanding: 0
    }),
    editableFields: [
      { label: 'Subject', value: 'Payment received: ₹{amount} for invoice {invoiceNumber}' },
      { label: 'Heading', value: 'Payment received' },
      { label: 'Body', value: "We've received a payment of ₹{amount} towards invoice {invoiceNumber}. Thank you!" },
      { label: 'Table Fields', value: 'Amount paid, Invoice, Date, Outstanding balance' }
    ]
  },

  // 6. Attendance & Leaves
  {
    id: 'leave-applied',
    category: 'Attendance & HR',
    badge: 'Approval Needed',
    title: 'New Leave Request (To Manager)',
    recipient: 'Admin / Reporting Manager',
    trigger: 'When an employee submits a leave application in the portal.',
    subject: 'New Leave Request: Vikram Sen (Casual Leave)',
    preheader: 'New leave application from Vikram Sen for 2 day(s).',
    html: renderLeaveAppliedEmail({
      employeeName: 'Vikram Sen',
      leaveType: 'Casual Leave',
      dates: '20 Oct 2026 to 21 Oct 2026',
      duration: '2 days',
      reason: 'Attending family wedding ceremony in Jaipur.'
    }),
    editableFields: [
      { label: 'Subject', value: 'New Leave Request: {employeeName} ({leaveType})' },
      { label: 'Heading', value: 'New Leave Application' },
      { label: 'Subtext', value: '{employeeName} has submitted a new leave request.' },
      { label: 'Table Fields', value: 'Employee, Leave Type, Dates, Reason' },
      { label: 'Button CTA', value: 'Review & Approve Leave' }
    ]
  },
  {
    id: 'leave-approved',
    category: 'Attendance & HR',
    badge: 'Approved',
    title: 'Leave Request Approved (To Employee)',
    recipient: 'Employee (applicant)',
    trigger: 'When manager or admin clicks "Approve" on a leave request.',
    subject: 'Leave Request Approved — Casual Leave (20 Oct 2026 to 21 Oct 2026)',
    preheader: 'Your leave request for 20 Oct 2026 to 21 Oct 2026 has been approved.',
    html: renderLeaveApprovedEmail({
      employeeName: 'Vikram Sen',
      leaveType: 'Casual Leave',
      dates: '20 Oct 2026 to 21 Oct 2026',
      duration: '2 days'
    }),
    editableFields: [
      { label: 'Subject', value: 'Leave Request Approved — {leaveType} ({dates})' },
      { label: 'Heading', value: 'Leave Request Approved' },
      { label: 'Subtext', value: 'Hello {employeeName}, your leave request has been Approved.' },
      { label: 'Button CTA', value: 'View Leave Details' }
    ]
  },
  {
    id: 'leave-rejected',
    category: 'Attendance & HR',
    badge: 'Rejected',
    title: 'Leave Request Rejected (To Employee)',
    recipient: 'Employee (applicant)',
    trigger: 'When manager or admin clicks "Reject" with reason.',
    subject: 'Leave Request Rejected — Casual Leave (20 Oct 2026 to 21 Oct 2026)',
    preheader: 'Your leave request for 20 Oct 2026 to 21 Oct 2026 was rejected.',
    html: renderLeaveRejectedEmail({
      employeeName: 'Vikram Sen',
      leaveType: 'Casual Leave',
      dates: '20 Oct 2026 to 21 Oct 2026',
      duration: '2 days',
      reason: 'Critical client milestone delivery scheduled during these dates. Please coordinate with team lead.'
    }),
    editableFields: [
      { label: 'Subject', value: 'Leave Request Rejected — {leaveType} ({dates})' },
      { label: 'Heading', value: 'Leave Request Update' },
      { label: 'Subtext', value: 'Hello {employeeName}, your leave request has been Rejected.' },
      { label: 'Reason Field', value: 'Rejection Reason: {reason}' },
      { label: 'Button CTA', value: 'View Leave Details' }
    ]
  },

  // 7. Freelancer Public Portal
  {
    id: 'freelancer-admin-alert',
    category: 'Freelancer Network',
    badge: 'Application',
    title: 'New Freelancer Application (Admin Alert)',
    recipient: 'Admin Team (admin@rudhram.in)',
    trigger: 'When a creative freelancer submits their profile on the public portal.',
    subject: 'New Freelancer Application: Siddharth Rao (FL-4091)',
    preheader: 'A new freelancer has submitted their profile for review.',
    html: renderFreelancerSubmissionEmail({
      freelancer: {
        fullName: 'Siddharth Rao',
        displayName: 'Siddharth Rao',
        phone: '+91 99201 12345',
        email: 'siddharth.rao@creativestudio.in',
        whatsappNumber: '+91 99201 12345',
        city: 'Mumbai',
        freelancerType: 'Cinematographer & Colorist',
        experienceYears: 6,
        freelancerCode: 'FL-4091',
        bio: 'Over 6 years of experience directing fashion films, brand documentaries, and commercial visual treatments using RED & ARRI ecosystems.',
        ventureProfiles: [
          {
            venture: 'damrru',
            internalTitle: 'Senior DOP & Colorist',
            serviceCategories: ['Commercial Cinematography', 'DaVinci Resolve Color Grading'],
            skillLevel: 'Expert',
            rateCards: [{ rateBasis: 'Per Day', amount: 35000, currency: 'INR' }]
          },
          {
            venture: 'panigrahna',
            internalTitle: 'Lead Wedding Cinematographer',
            serviceCategories: ['Teaser Editing', 'Traditional & Drone Cinematography'],
            skillLevel: 'Advanced',
            rateCards: [{ rateBasis: 'Per Event', amount: 55000, currency: 'INR' }]
          }
        ]
      }
    }),
    editableFields: [
      { label: 'Subject', value: 'New Freelancer Application: {fullName} ({freelancerCode})' },
      { label: 'Heading', value: 'New Freelancer Application' },
      { label: 'Subtext', value: 'A new freelancer has submitted their profile for review' },
      { label: 'Table Fields', value: 'Name, Phone, Email, City, Type, Experience, Code, Venture Profiles, Bio' }
    ]
  },
  {
    id: 'freelancer-applicant-confirm',
    category: 'Freelancer Network',
    badge: 'Applicant Receipt',
    title: 'Freelancer Application Acknowledgment',
    recipient: 'Freelancer Applicant (siddharth.rao@creativestudio.in)',
    trigger: 'Sent immediately to applicant after successful submission.',
    subject: 'Application Received - Rudhram Freelancer Network',
    preheader: 'We have received your freelancer application',
    html: renderFreelancerApplicantEmail({
      freelancer: {
        fullName: 'Siddharth Rao',
        freelancerCode: 'FL-4091'
      }
    }),
    editableFields: [
      { label: 'Subject', value: 'Application Received - Rudhram Freelancer Network' },
      { label: 'Heading', value: 'Application Received' },
      { label: 'Greeting', value: 'Dear {fullName},' },
      { label: 'Body 1', value: 'Thank you for applying to join the Rudhram freelancer network. We have successfully received your application (Code: {freelancerCode}).' },
      { label: 'Body 2', value: 'Our team will review your profile and keep your details in our secure records. If your profile matches our requirements for any upcoming projects, we will reach out to you directly.' }
    ]
  },

  // 8. General System Notification
  {
    id: 'system-notification',
    category: 'System',
    badge: 'Notification',
    title: 'In-App Notification Mirror',
    recipient: 'CRM User',
    trigger: 'When an in-app notification is mirrored to user email.',
    subject: 'Project Milestone Reached: Q3 Brand Collaterals Completed',
    preheader: 'Project Milestone Reached: Q3 Brand Collaterals Completed',
    html: renderNotificationEmail({
      title: 'Project Milestone Reached: Q3 Brand Collaterals Completed',
      message: 'All brand identity assets, font packages, and presentation decks for InnovateX Media Ltd. have been uploaded and approved by the creative director.',
      link: '/projects/66f81a92e104'
    }),
    editableFields: [
      { label: 'Subject', value: '{notificationTitle}' },
      { label: 'Heading', value: '{notificationTitle}' },
      { label: 'Message', value: '{notificationBody}' },
      { label: 'Button CTA', value: 'View details' }
    ]
  }
];

const categories = [...new Set(emails.map(e => e.category))];

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rudhram CRM - All Email Messages & Templates Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0c0e12;
      --sidebar: #12151c;
      --sidebar-border: #1e2430;
      --card: #181d26;
      --card-border: #232b38;
      --accent: #b47737;
      --accent-glow: rgba(180, 119, 55, 0.18);
      --accent-light: #e6c8a0;
      --text: #f1f5f9;
      --text-muted: #8b95a5;
      --success: #10b981;
      --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      display: flex;
      height: 100vh;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Sidebar */
    .sidebar {
      width: 380px;
      min-width: 380px;
      background: var(--sidebar);
      border-right: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .brand-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--sidebar-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(18, 21, 28, 0.8);
      backdrop-filter: blur(12px);
    }

    .brand-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #b47737, #e6c8a0);
      color: #12151c;
      font-weight: 800;
      font-size: 16px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(180, 119, 55, 0.35);
    }

    .brand-title h1 {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: #fff;
    }

    .brand-title p {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .count-pill {
      font-size: 11px;
      font-weight: 600;
      background: var(--card-border);
      color: var(--accent-light);
      padding: 3px 9px;
      border-radius: 12px;
      border: 1px solid rgba(180, 119, 55, 0.25);
    }

    /* Search & Filter */
    .search-box {
      padding: 14px 20px;
      border-bottom: 1px solid var(--sidebar-border);
    }

    .search-input {
      width: 100%;
      background: #0d1016;
      border: 1px solid var(--sidebar-border);
      border-radius: 8px;
      padding: 9px 14px;
      color: #fff;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    /* Email List */
    .email-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 14px;
      scrollbar-width: thin;
      scrollbar-color: #232b38 transparent;
    }

    .category-group {
      margin-bottom: 18px;
    }

    .category-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .email-item {
      padding: 12px 14px;
      border-radius: 10px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(255, 255, 255, 0.015);
    }

    .email-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.06);
    }

    .email-item.active {
      background: rgba(180, 119, 55, 0.12);
      border-color: rgba(180, 119, 55, 0.4);
    }

    .email-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .email-item-title {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .email-item.active .email-item-title {
      color: #fce7cf;
    }

    .email-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      background: #1e2533;
      color: #94a3b8;
    }

    .email-item.active .email-badge {
      background: rgba(180, 119, 55, 0.3);
      color: #fed7aa;
    }

    .email-item-recipient {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Main Area */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: #090b0e;
    }

    /* Top Action Bar */
    .topbar {
      padding: 16px 28px;
      background: var(--sidebar);
      border-bottom: 1px solid var(--sidebar-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .topbar-info {
      flex: 1;
      min-width: 0;
    }

    .topbar-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .meta-tag {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(180, 119, 55, 0.15);
      color: var(--accent-light);
      border: 1px solid rgba(180, 119, 55, 0.3);
    }

    .recipient-tag {
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .subject-headline {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    }

    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    .copy-btn.copied {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }

    /* Device Toggles */
    .view-toggles {
      display: flex;
      background: #0d1016;
      border: 1px solid var(--sidebar-border);
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
    }

    .view-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .view-btn:hover {
      color: #fff;
    }

    .view-btn.active {
      background: var(--card-border);
      color: #fff;
    }

    /* Workspace */
    .workspace {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    /* Email Canvas */
    .canvas-container {
      flex: 1;
      background: #07080b;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
      position: relative;
    }

    .canvas-frame-wrap {
      transition: width 0.3s ease, height 0.3s ease;
      background: #fff;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 860px;
    }

    .canvas-frame-wrap.desktop {
      width: 680px;
    }

    .canvas-frame-wrap.mobile {
      width: 375px;
      border-radius: 36px;
      border: 8px solid #27272a;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
      max-height: 760px;
    }

    .canvas-frame-wrap.fullscreen {
      width: 100%;
      max-width: 1000px;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
    }

    /* Right Details Inspector Panel */
    .inspector {
      width: 360px;
      min-width: 360px;
      background: var(--sidebar);
      border-left: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      padding: 20px;
      gap: 20px;
    }

    .inspector h3 {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 600;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-val {
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.5;
    }

    .field-tag {
      background: #11141b;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-light);
    }

    .field-body {
      font-size: 12px;
      color: #cbd5e1;
      font-family: var(--font);
      line-height: 1.5;
      word-break: break-word;
    }

    .instruction-note {
      background: rgba(180, 119, 55, 0.08);
      border: 1px solid rgba(180, 119, 55, 0.25);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 12px;
      color: #fed7aa;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="brand-header">
      <div class="brand-badge">
        <div class="brand-icon">R</div>
        <div class="brand-title">
          <h1>Rudhram Mail Hub</h1>
          <p>Email Template Previewer</p>
        </div>
      </div>
      <span class="count-pill">${emails.length} Emails</span>
    </div>

    <div class="search-box">
      <input type="text" id="searchInput" class="search-input" placeholder="Search templates, subjects, roles..." oninput="filterEmails()">
    </div>

    <div class="email-list" id="emailList">
      <!-- Populated by JS -->
    </div>
  </aside>

  <!-- Main View -->
  <main class="main">
    <!-- Top Action Bar -->
    <header class="topbar">
      <div class="topbar-info">
        <div class="topbar-badge-row">
          <span class="meta-tag" id="currentCategory">Client & Portal</span>
          <span class="recipient-tag" id="currentRecipient">To: Client</span>
        </div>
        <div class="subject-headline">
          <span id="currentSubject">Welcome to Rudhram, Rajesh Mehta</span>
          <button class="copy-btn" id="copySubjectBtn" onclick="copySubject()">
            <span>Copy Subject</span>
          </button>
        </div>
      </div>

      <div class="view-toggles">
        <button class="view-btn active" id="btnDesktop" onclick="setViewMode('desktop')">
          <span>💻 Desktop (680px)</span>
        </button>
        <button class="view-btn" id="btnMobile" onclick="setViewMode('mobile')">
          <span>📱 Mobile (375px)</span>
        </button>
        <button class="view-btn" id="btnFull" onclick="setViewMode('fullscreen')">
          <span>🖥️ Wide</span>
        </button>
      </div>
    </header>

    <!-- Workspace -->
    <div class="workspace">
      <!-- Canvas -->
      <div class="canvas-container">
        <div class="canvas-frame-wrap desktop" id="canvasFrame">
          <iframe id="emailIframe" title="Email Preview"></iframe>
        </div>
      </div>

      <!-- Right Inspector -->
      <aside class="inspector">
        <div>
          <h3>📌 Message Context</h3>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">When is this sent?</span>
            <span class="info-val" id="currentTrigger">When a client is converted.</span>
          </div>
          <div class="info-row">
            <span class="info-label">Preheader Text</span>
            <span class="info-val" id="currentPreheader" style="font-style: italic; color: #94a3b8;">—</span>
          </div>
        </div>

        <div>
          <h3>✏️ Current Content & Copy</h3>
        </div>

        <div class="instruction-note">
          💡 <strong>Want to update this email?</strong><br>
          Tell me which text block or subject below you want to change, and what the new copy should say!
        </div>

        <div id="editableFieldsContainer" style="display:flex; flex-direction:column; gap:8px;">
          <!-- Populated by JS -->
        </div>
      </aside>
    </div>
  </main>

  <script>
    const emailsData = ${JSON.stringify(emails)};
    let activeId = emailsData[0].id;

    function renderList() {
      const listEl = document.getElementById('emailList');
      const query = document.getElementById('searchInput').value.toLowerCase().trim();

      const grouped = {};
      emailsData.forEach(email => {
        if (query) {
          const match = email.title.toLowerCase().includes(query) ||
                        email.subject.toLowerCase().includes(query) ||
                        email.category.toLowerCase().includes(query) ||
                        email.recipient.toLowerCase().includes(query);
          if (!match) return;
        }

        if (!grouped[email.category]) grouped[email.category] = [];
        grouped[email.category].push(email);
      });

      let html = '';
      for (const [category, items] of Object.entries(grouped)) {
        html += '<div class="category-group">';
        html += '<div class="category-title"><span>' + category + '</span><span>' + items.length + '</span></div>';
        items.forEach(item => {
          const isActive = item.id === activeId ? 'active' : '';
          html += '<div class="email-item ' + isActive + '" onclick="selectEmail(\\'' + item.id + '\\')">';
          html += '  <div class="email-item-header">';
          html += '    <span class="email-item-title">' + item.title + '</span>';
          html += '    <span class="email-badge">' + item.badge + '</span>';
          html += '  </div>';
          html += '  <div class="email-item-recipient">' + item.recipient + '</div>';
          html += '</div>';
        });
        html += '</div>';
      }

      if (Object.keys(grouped).length === 0) {
        html = '<div style="padding: 30px 20px; text-align: center; color: #64748b; font-size: 13px;">No emails found matching "' + query + '"</div>';
      }

      listEl.innerHTML = html;
    }

    function selectEmail(id) {
      activeId = id;
      renderList();
      const email = emailsData.find(e => e.id === id);
      if (!email) return;

      document.getElementById('currentCategory').textContent = email.category;
      document.getElementById('currentRecipient').textContent = 'To: ' + email.recipient;
      document.getElementById('currentSubject').textContent = email.subject;
      document.getElementById('currentTrigger').textContent = email.trigger;
      document.getElementById('currentPreheader').textContent = email.preheader || 'None';

      // Update iframe
      const iframe = document.getElementById('emailIframe');
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(email.html);
      doc.close();

      // Update fields
      const container = document.getElementById('editableFieldsContainer');
      let fieldsHtml = '';
      (email.editableFields || []).forEach(f => {
        fieldsHtml += '<div class="field-tag">';
        fieldsHtml += '  <div class="field-title">' + f.label + '</div>';
        fieldsHtml += '  <div class="field-body">' + f.value + '</div>';
        fieldsHtml += '</div>';
      });
      container.innerHTML = fieldsHtml;
    }

    function setViewMode(mode) {
      const frame = document.getElementById('canvasFrame');
      document.getElementById('btnDesktop').classList.remove('active');
      document.getElementById('btnMobile').classList.remove('active');
      document.getElementById('btnFull').classList.remove('active');

      frame.className = 'canvas-frame-wrap ' + mode;

      if (mode === 'desktop') document.getElementById('btnDesktop').classList.add('active');
      if (mode === 'mobile') document.getElementById('btnMobile').classList.add('active');
      if (mode === 'fullscreen') document.getElementById('btnFull').classList.add('active');
    }

    function copySubject() {
      const email = emailsData.find(e => e.id === activeId);
      if (!email) return;
      navigator.clipboard.writeText(email.subject);
      const btn = document.getElementById('copySubjectBtn');
      btn.classList.add('copied');
      btn.innerHTML = '<span>Copied! ✓</span>';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<span>Copy Subject</span>';
      }, 2000);
    }

    function filterEmails() {
      renderList();
    }

    // Init
    window.addEventListener('DOMContentLoaded', () => {
      renderList();
      selectEmail(emailsData[0].id);
    });
  </script>
</body>
</html>
`;

const targetPath1 = path.resolve(import.meta.dirname, '../../mail.html');
const targetPath2 = path.resolve(import.meta.dirname, '../../client/public/mail.html');
fs.writeFileSync(targetPath1, htmlContent, 'utf-8');
fs.writeFileSync(targetPath2, htmlContent, 'utf-8');
console.log('Successfully generated ' + targetPath1 + ' and ' + targetPath2);
