"use client";
import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, KeyRound, UserRoundPlus, LoaderCircle } from 'lucide-react';
import { PolicyLink } from '@/components/legal/PolicyNavigation';
import { INSTITUTES } from '@/components/common/InstituteSelector';
import Input from '@/components/common/Input';
import { webGoogleLinkSchema, webStudentRegistrationSchema } from '@/lib/auth-schema';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import type { IteStudentProgramCode } from '@/lib/ite-programs/features';
import { syncSessionToNative } from '@/lib/mobile-bridge';
import GoogleSignIn from './GoogleSignIn';
import styles from './login.module.css';
import register from './register.module.css';

export interface IteProgramOption {
  id: string;
  code: IteStudentProgramCode;
  name: string;
}

type Props = {
  instituteCode: string;
  googleEnabled: boolean;
  googleProfile: { name: string; email: string } | null;
  linking: boolean;
  studentNumber?: string;
  googleExpired?: boolean;
  itePrograms?: IteProgramOption[];
  missingItePrograms?: IteStudentProgramCode[];
};

export default function RegisterForm({
  instituteCode,
  googleEnabled,
  googleProfile,
  linking,
  studentNumber = '',
  googleExpired = false,
  itePrograms = [],
  missingItePrograms = [],
}: Props) {
  const [institute, setInstitute] = useState(instituteCode);
  const [program, setProgram] = useState('');
  const [saving, setSaving] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [error, setError] = useState('');
  const busy = saving || googleBusy;
  const isIte = institute === 'ite';
  const hasMissingIteConfig = isIte && missingItePrograms.length > 0;
  const theme = getInstituteTheme(institute);
  const instituteStyle = {
    '--login-institute': theme.colors.primary,
    '--login-institute-index': INSTITUTES.findIndex(item => item.code === institute),
  } as CSSProperties;

  function handleSelectInstitute(nextInstitute: string) {
    setInstitute(nextInstitute);
    if (nextInstitute !== 'ite') {
      setProgram('');
    }
    setError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (hasMissingIteConfig) {
      setError(
        `ITE registration is unavailable because the following academic program(s) are missing in the database: ${missingItePrograms.join(', ')}.`
      );
      return;
    }

    const form = new FormData(event.currentTarget);
    const rawValues = Object.fromEntries(form);
    const payload: Record<string, unknown> = {
      ...rawValues,
      instituteCode: institute,
      google: Boolean(googleProfile),
      acceptedPolicies,
      ...(isIte ? { program } : {}),
    };
    if (!isIte) {
      delete payload.program;
    }

    const schema = linking ? webGoogleLinkSchema : webStudentRegistrationSchema;
    const validation = schema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your registration details.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to register. Please try again.');
      syncSessionToNative(data.token, data.user);
      window.location.assign(data.redirectTo);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to register.');
      setSaving(false);
    }
  }

  return <main className={styles.page} style={instituteStyle} data-institute={institute}>
    <div className={`${styles.ambient} ${styles.sage}`} aria-hidden="true" />
    <div className={`${styles.ambient} ${styles.gold}`} aria-hidden="true" />
    <nav className={styles.navigation} aria-label="Page navigation">
      <Link href={`/login?institute=${institute}`} className={styles.home}><ArrowLeft aria-hidden="true" />Back to sign in</Link>
    </nav>
    <div className={`${styles.composition} ${register.composition}`}>
      <section className={styles.introduction} aria-labelledby="register-title">
        <h1 id="register-title" className={styles.headline}>Your next chapter<br /><em>starts with you.</em></h1>
        <p className={styles.description}>One account for your classes, your community,<br className={styles.desktopBreak} /> and everything you’ll learn along the way.</p>
        <ol className={register.journey} aria-label="Getting started">
          <li><span className={styles.featureIcon}><UserRoundPlus aria-hidden="true" /></span><div><h2>Create your account.</h2><p>Use your student ID and choose your institute.</p></div></li>
          <li><span className={styles.featureIcon}><KeyRound aria-hidden="true" /></span><div><h2>Enter your class code.</h2><p>Your instructor’s code connects you to a class in your institute.</p></div></li>
          <li><span className={styles.featureIcon}><BookOpen aria-hidden="true" /></span><div><h2>Make yourself at home.</h2><p>Access your classes and your institute’s learning tools.</p></div></li>
        </ol>
        <p className={register.instituteNote}><span aria-hidden="true" />Your learning space belongs to your institute.</p>
      </section>
      <div className={styles.loginArea}>
        <section className={`${styles.panel} ${register.panel}`} aria-labelledby="create-account-title">
          <header className={styles.panelBrand}>
            <Image src="/images/cdm-logo.png" alt="Colegio de Montalban crest" width={64} height={64} priority />
            <h2 id="create-account-title">{linking ? 'Sign in and connect Google' : googleProfile ? 'Complete your student account' : 'Create your student account'}</h2>
            <p>{linking ? `An account already exists for this email in ${institute.toUpperCase()}.` : 'A few details, and you’re ready for your first class.'}</p>
          </header>
          <form onSubmit={submit} className={styles.form} aria-busy={busy}>
            {googleExpired && <p role="alert" className={styles.error}>Google sign-in expired. Continue with Google again.</p>}
            <div>
              <span className={styles.fieldLabel} id="register-institute-label">Select your institute</span>
              <input type="hidden" name="instituteCode" value={institute} />
              <div className={styles.instituteTrack} role="group" aria-labelledby="register-institute-label">
                <span className={styles.instituteSelection} aria-hidden="true" />
                {INSTITUTES.map(item => <button key={item.code} type="button" className={styles.institute} aria-pressed={institute === item.code} aria-controls="register-institute-name" disabled={busy || linking} onClick={() => handleSelectInstitute(item.code)}>{item.short}</button>)}
              </div>
              <p className={styles.instituteName} id="register-institute-name" aria-live="polite">{theme.name}{linking ? ' · Your existing institute' : ''}</p>
            </div>
            <div className={register.details}>
              {isIte && (
                <div className={`${styles.field} ${register.field} ${register.fullWidth}`}>
                  <div className="grid gap-1.5">
                    <label htmlFor="register-program" className="text-xs font-semibold text-slate-700 dark:text-[#8B92A5]">
                      Select your program
                    </label>
                    <select
                      id="register-program"
                      name="program"
                      value={program}
                      onChange={event => {
                        setProgram(event.target.value);
                        setError('');
                      }}
                      required
                      disabled={busy || hasMissingIteConfig}
                      aria-describedby="register-program-hint"
                      className={register.selectControl}
                    >
                      <option value="">Select your ITE academic program</option>
                      {itePrograms.map(item => (
                        <option key={item.id} value={item.code}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span id="register-program-hint" className={register.hint}>
                    Your program customizes your ITE student dashboard and tools, and is locked after registration.
                  </span>
                  {hasMissingIteConfig && (
                    <p role="alert" className={styles.error}>
                      Configuration error: Required ITE program(s) missing in database ({missingItePrograms.join(', ')}). Please contact an administrator.
                    </p>
                  )}
                </div>
              )}
              <div className={`${styles.field} ${register.field}`}><Input id="register-name" name="name" label="Full name" placeholder="Your full name" theme={theme} autoComplete="name" defaultValue={googleProfile?.name} readOnly={linking} minLength={2} maxLength={150} required disabled={busy} /></div>
              <div className={`${styles.field} ${register.field}`}><Input id="register-student-id" name="studentNumber" label="Student ID" theme={theme} aria-describedby="student-id-hint" autoComplete="off" placeholder="26-12345" defaultValue={studentNumber} readOnly={linking} pattern={linking ? undefined : "[0-9]{2}-[0-9]{5}"} maxLength={linking ? 40 : 8} title="Two digits, a hyphen, then five digits (26-12345)" required={!linking} disabled={busy} /><span id="student-id-hint" className={register.hint}>{linking ? 'Use your existing student ID.' : 'Format: XX-XXXXX'}</span></div>
              <div className={`${styles.field} ${register.field} ${register.fullWidth}`}><Input id="register-email" name="email" label="Email" placeholder="you@example.com" theme={theme} type="email" autoComplete="email" defaultValue={googleProfile?.email} readOnly={Boolean(googleProfile)} maxLength={254} required disabled={busy} /></div>
              <div className={`${styles.field} ${register.field} ${linking ? register.fullWidth : ''}`}><Input id="register-password" name="password" label={linking ? 'Existing password' : 'Password'} theme={theme} placeholder="Enter password" aria-describedby="password-hint" type="password" autoComplete={linking ? 'current-password' : 'new-password'} minLength={linking ? 1 : 8} required disabled={busy} /></div>
              {!linking && <div className={`${styles.field} ${register.field}`}><Input id="register-confirm-password" name="confirmPassword" label="Confirm password" theme={theme} placeholder="Repeat password" type="password" autoComplete={linking ? 'current-password' : 'new-password'} minLength={8} required disabled={busy} /></div>}
              <p id="password-hint" className={`${register.hint} ${register.fullWidth}`}>{linking ? 'Enter your current LMS password once to connect Google and sign in.' : 'Use at least 8 characters with uppercase, lowercase, and a number.'}</p>
              {linking && <div className={`${styles.forgot} ${register.fullWidth}`}><Link href={`/forgot-password?institute=${institute}`}>Forgot your LMS password?</Link></div>}
            </div>
            <div className={styles.consent}>
              <input id="register-policies" type="checkbox" name="acceptedPolicies" checked={acceptedPolicies} onChange={event => { setAcceptedPolicies(event.target.checked); setError(''); }} required disabled={busy} />
              <label htmlFor="register-policies">I agree to the <PolicyLink href="/terms">Terms and Conditions</PolicyLink> and acknowledge the <PolicyLink href="/privacy">Privacy Policy</PolicyLink>.</label>
            </div>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={busy || hasMissingIteConfig}>{saving ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}{saving ? 'Saving your account…' : linking ? 'Connect Google and sign in' : 'Create account'}</button>
            {!googleProfile && googleEnabled && <GoogleSignIn instituteCode={institute} acceptedPolicies={acceptedPolicies} disabled={busy} onBusyChange={setGoogleBusy} onError={setError} />}
            <div className={styles.accountHelp}><span>Already have an account?</span><Link href={`/login?institute=${institute}`}>Sign in</Link></div>
          </form>
        </section>
        <p className={styles.cardCaption}>Colegio de Montalban · Learning Management System</p>
      </div>
    </div>
    <div className={styles.pageFooter}>
      <span>© {new Date().getFullYear()} Colegio de Montalban</span>
      <nav aria-label="Registration policies and support"><PolicyLink href="/privacy">Privacy</PolicyLink><PolicyLink href="/terms">Terms</PolicyLink><PolicyLink href="/support">Support</PolicyLink></nav>
    </div>
  </main>;
}
