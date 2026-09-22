import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';

const navItems = [{ href: '/doctor/dashboard', label: 'Patients' }];

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'doctor') redirect('/patient/dashboard');

  return (
    <div className="min-h-screen bg-clinical-50">
      <Navbar items={navItems} userName={session.name} role={session.role} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
