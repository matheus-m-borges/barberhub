export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg">
          Barber<span className="text-primary">Hub</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Gestão inteligente para sua barbearia.
        </p>
      </div>
    </footer>
  );
}
