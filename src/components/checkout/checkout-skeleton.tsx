import { Input } from "@/components/ui/input";

export function CheckoutSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
      <form aria-describedby="checkout-notice" className="space-y-8">
        <p
          className="border-brand text-brand border bg-white p-4 text-sm leading-6"
          id="checkout-notice"
        >
          Это только UI-прототип. Форма не отправляет данные, оплата и доставка
          не подключены.
        </p>
        <fieldset className="space-y-4">
          <legend className="text-2xl font-medium tracking-tight">
            Контактные данные
          </legend>
          <label className="block text-sm">
            Email
            <Input
              className="mt-2"
              disabled
              name="email"
              placeholder="name@example.com"
              type="email"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Имя
              <Input className="mt-2" disabled name="firstName" />
            </label>
            <label className="block text-sm">
              Фамилия
              <Input className="mt-2" disabled name="lastName" />
            </label>
          </div>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="text-2xl font-medium tracking-tight">
            Доставка
          </legend>
          <label className="block text-sm">
            Город
            <Input className="mt-2" disabled name="city" />
          </label>
          <label className="block text-sm">
            Адрес
            <Input className="mt-2" disabled name="address" />
          </label>
        </fieldset>
        <button
          className="bg-line text-muted min-h-12 w-full cursor-not-allowed px-5 text-xs font-semibold tracking-widest uppercase"
          disabled
          type="button"
        >
          Оплата недоступна в демо
        </button>
      </form>
      <aside className="border-line h-fit border bg-white p-6">
        <p className="eyebrow text-muted">Order summary</p>
        <div className="text-muted mt-6 space-y-3 text-sm">
          <p>Реальные товары не выбраны.</p>
          <p>Стоимость и доставка не рассчитываются.</p>
        </div>
      </aside>
    </div>
  );
}
