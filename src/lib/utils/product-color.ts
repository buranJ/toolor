const productColorMap: Record<string, string> = {
  белый: "#ecece8",
  черный: "#141617",
  графит: "#51585b",
  синий: "#24436d",
  "темно синий": "#172943",
  голубой: "#a9c7d8",
  красный: "#8f2525",
  бордовый: "#5e202b",
  бежевый: "#c7b69d",
  оливковый: "#6f7457",
  серый: "#7b868c",
  "темно серый": "#4b5052",
  "светло зеленый": "#aab8a2",
  айвори: "#eee9dc",
  лайм: "#b2cc3f",
  зеленый: "#557a51",
  хаки: "#797b53",
  фиолетовый: "#795284",
  коричневый: "#816044",
  шоколадный: "#5b3f32",
  песочный: "#c5b18c",
  электросиний: "#1b5aff",
  "вареный синий": "#6b89a6",
  "бледно золотой": "#dbc98b",
  "бледно коричневый": "#b9a08b",
  "желто коричневый": "#ab873e",
  "умеренно желтый": "#d1b85c",
  "серо голубой": "#93a9b7",
  "сине графит": "#455565",
  "черно зеленый": "#304a3a",
};

export function getProductColorHex(color: string): string | undefined {
  // Supplier spelling varies (ё/е, spaces/hyphens, embroidery annotations).
  // Only normalize the swatch lookup, never the source color or filter value.
  const key = color
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\([^)]*\)/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return productColorMap[key];
}
