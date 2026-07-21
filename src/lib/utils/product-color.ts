const productColorMap: Record<string, string> = {
  белый: "#ecece8",
  черный: "#141617",
  графит: "#51585b",
  синий: "#24436d",
  "темно-синий": "#172943",
  голубой: "#a9c7d8",
  красный: "#8f2525",
  бордовый: "#5e202b",
  бежевый: "#c7b69d",
  оливковый: "#6f7457",
  серый: "#7b868c",
  "темно-серый": "#4b5052",
  "светло-зеленый": "#aab8a2",
};

export function getProductColorHex(color: string): string | undefined {
  return productColorMap[color.toLocaleLowerCase("ru-RU")];
}
