/** Скелет страницы кабинета, пока сервер получает данные из SHM. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Загрузка">
      <div className="bg-green/20 mb-2 h-3 w-32 animate-pulse rounded" />
      <div className="mb-8 h-8 w-64 animate-pulse rounded-lg bg-white/10" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[.04]" />
        ))}
      </div>
    </div>
  );
}
