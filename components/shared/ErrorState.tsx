export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] border border-fog bg-pure-white p-6 text-moss-shadow">
      <p className="font-sans text-sm">{message}</p>
    </div>
  );
}
