import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';

const navItems = [
  { href: '/patient/dashboard', label: 'Dashboard' },
  { href: '/patient/check-in', label: 'Check-in' },
  { href: '/patient/exercises', label: 'Exercises' },
  { href: '/patient/progress', label: 'Progress' },
];

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'patient') redirect('/doctor/dashboard');

  return (
    <div className="min-h-screen bg-clinical-50">
      <Navbar items={navItems} userName={session.name} role={session.role} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
