import CreateEventForm from '@/app/components/CreateEventForm';

export default function EntryPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create an event</h1>
      </header>

      <CreateEventForm />
    </main>
  );
}