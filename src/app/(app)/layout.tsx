import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import NavBar from '@/components/NavBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen">
      <NavBar email={user.email} />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
