export type Review = {
  name: string;
  city: string;
  initials: string;
  rating: 5;
  quote: string;
  context: string;
};

/**
 * Homepage testimonials. Placeholder copy for launch — replace with real
 * customer reviews (and their consent) before going live.
 */
export const reviews: Review[] = [
  {
    name: "Азамат Ж.",
    city: "Бишкек",
    initials: "АЖ",
    rating: 5,
    quote:
      "Куртка держит тепло в горах, а в городе выглядит как надо. Ношу почти каждый день с октября.",
    context: "Куртки",
  },
  {
    name: "Аруузат С.",
    city: "Ош",
    initials: "АС",
    rating: 5,
    quote:
      "Комплект сел идеально, ткань приятная к телу. Приятно, что бренд наш, кыргызстанский.",
    context: "Комплекты",
  },
  {
    name: "Данияр Т.",
    city: "Бишкек",
    initials: "ДТ",
    rating: 5,
    quote:
      "Заказ привезли быстро, всё аккуратно упаковано. Размер подошёл по таблице — ничего не пришлось менять.",
    context: "Доставка",
  },
  {
    name: "Нурай К.",
    city: "Каракол",
    initials: "НК",
    rating: 5,
    quote:
      "Брала платок в подарок — качество на уровне, цвет как на фото. Забрала себе ещё один.",
    context: "Платки",
  },
  {
    name: "Эмир А.",
    city: "Бишкек",
    initials: "ЭА",
    rating: 5,
    quote:
      "Спокойный крой, ничего лишнего — ровно то, что искал. Сочетается с чем угодно в гардеробе.",
    context: "Футболки",
  },
  {
    name: "Айгерим Б.",
    city: "Джалал-Абад",
    initials: "АБ",
    rating: 5,
    quote:
      "Консультанты помогли выбрать размер в переписке, ответили за пару минут. Вещь ношу вторую зиму.",
    context: "Сервис",
  },
];
