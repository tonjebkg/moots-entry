export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Moots Entry</h1>
      <ul className="mt-4 list-disc pl-6">
        <li><a href="/entry" className="underline">Create / view events</a></li>
        <li><a href="/checkin/your-event-id" className="underline">Check-in</a></li>
        <li><a href="/dashboard/your-event-id" className="underline">Host dashboard</a></li>
      </ul>
    </main>
  );
}
