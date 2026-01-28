import CreateEventForm from '@/app/components/CreateEventForm';

export default function EntryPage() {
  // Guard: Skip Supabase-dependent pages when in dashboard mode
  if (process.env.NEXT_PUBLIC_APP_MODE === 'dashboard') {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-white">Entry page not available in dashboard mode</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create an event</h1>
      </header>

      <CreateEventForm />
    </main>
  );
}