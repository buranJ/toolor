# Исходники медиа

Мастера, из которых собирается ролик героя. Лежат вне `public/`, поэтому не
попадают в деплой — иначе каждый посетитель качал бы десятки мегабайт, которые
сайту не нужны.

| Файл | Что это |
|---|---|
| `hero-mobile-master.mp4` | Вертикальный герой, 2160×3840, 15 с |
| `hero-desktop-master.mp4` | Горизонтальный герой, 3840×2160, 10 с |

Дорожки для сайта (`public/media/hero/hero-{mobile,desktop}.bin`) собираются
одной командой, нужен ffmpeg с libx264:

```sh
corepack pnpm hero:build
```

Что внутри и почему так — в шапке `scripts/build-hero-video.ts`.

Кадры в `public/media/hero/frames/` — запасной вариант для браузеров без
WebCodecs (iOS до 16.4, старый Firefox). Если мастер меняется, их тоже стоит
пересобрать:

```sh
# мобильные: 96 кадров 1440×2560
ffmpeg -i media-src/hero-mobile-master.mp4 \
  -vf "fps=96/15.0417,scale=1440:2560:flags=lanczos" -frames:v 96 /tmp/f%03d.png
for f in /tmp/f*.png; do cwebp -q 50 -m 6 "$f" -o "public/media/hero/frames/mobile/$(basename ${f%.png}).webp"; done
# десктопные: 96 кадров 2880×1620
ffmpeg -i media-src/hero-desktop-master.mp4 \
  -vf "fps=96/10.0417,scale=2880:1620:flags=lanczos" -frames:v 96 /tmp/d%03d.png
for f in /tmp/d*.png; do cwebp -q 45 -m 6 "$f" -o "public/media/hero/frames/desktop/$(basename ${f%.png} | sed 's/^d/f/').webp"; done
```
