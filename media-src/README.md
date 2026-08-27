# Исходники медиа

Мастера, из которых собираются кадры героя. Лежат вне `public/`, поэтому не
попадают в деплой — иначе каждый посетитель качал бы десятки мегабайт, которые
сайту не нужны.

| Файл | Что это |
|---|---|
| `hero-mobile-master.mp4` | Вертикальный герой, 2160×3840 |

Десктопный мастер (3840×2160) лежит в истории git: `git show d92fed5^:public/video/v-1.mp4 > v-1.mp4`.

Кадры пересобираются так:

```sh
# мобильные: 1440×2560 — покрывает физические пиксели телефонов с DPR 3
ffmpeg -i media-src/hero-mobile-master.mp4 \
  -vf "fps=96/15.0417,scale=1440:2560:flags=lanczos" -frames:v 96 /tmp/f%03d.png
for f in /tmp/f*.png; do cwebp -q 50 -m 6 "$f" -o "public/media/hero/frames/mobile/$(basename ${f%.png}).webp"; done
```
