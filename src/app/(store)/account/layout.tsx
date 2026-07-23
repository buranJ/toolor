import { AccountNav } from "@/components/account/account-nav";
import { Container } from "@/components/ui/container";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container className="py-10 md:py-16">
      <p className="eyebrow text-brand">Личный кабинет</p>
      <h1 className="mt-4 text-4xl font-medium tracking-[-0.05em] md:text-6xl">
        Личный кабинет
      </h1>
      <p className="text-muted mt-4 max-w-xl text-sm leading-6">
        Здесь будут ваши заказы, избранное и данные профиля.
      </p>
      <div className="mt-10">
        <AccountNav />
      </div>
      <div className="py-10">{children}</div>
    </Container>
  );
}
