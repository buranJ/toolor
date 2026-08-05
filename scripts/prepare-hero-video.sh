#!/usr/bin/env bash
#
# Prepare the scroll-scrubbed Hero video + poster.
#
# Transcodes the heavy master (public/video/v-1.mp4, 4K HEVC 10-bit) into a
# light, seek-friendly H.264 file with frequent keyframes so scrubbing by
# scroll stays smooth, plus a WebP poster from the first frame.
#
# Usage: scripts/prepare-hero-video.sh [SOURCE]
#   SOURCE defaults to public/video/v-1.mp4
#
# Idempotent: safe to re-run. Does not touch the source.

set -euo pipefail

SOURCE="${1:-public/video/v-1.mp4}"
OUT_DIR="public/media/hero"
OUT_VIDEO="${OUT_DIR}/hero-scroll.mp4"
OUT_POSTER="${OUT_DIR}/hero-poster.webp"

# Tunables (see step 1 requirements).
MAX_WIDTH=1920
CRF=21
FPS=24
GOP=6           # keyframe roughly every 6 frames @ 24fps for scrubbing
MAX_MB=20       # hard ceiling; escalate quality reduction above this

for bin in ffmpeg ffprobe; do
  command -v "$bin" >/dev/null 2>&1 || { echo "ERROR: $bin not found in PATH"; exit 1; }
done

[ -f "$SOURCE" ] || { echo "ERROR: source not found: $SOURCE"; exit 1; }

mkdir -p "$OUT_DIR"

probe() {
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,profile \
    -show_entries format=duration,bit_rate \
    -of default=noprint_wrappers=1 "$1"
}

file_mb() { echo "scale=2; $(wc -c < "$1") / 1048576" | bc; }

keyframe_report() {
  # Count I-frames and report the average keyframe interval in frames.
  local iframes total
  iframes=$(ffprobe -v error -select_streams v:0 -show_frames \
    -show_entries frame=pict_type -of csv=p=0 "$1" | grep -c '^I' || true)
  total=$(ffprobe -v error -select_streams v:0 \
    -count_frames -show_entries stream=nb_read_frames \
    -of default=noprint_wrappers=1:nokey=1 "$1")
  echo "keyframes=${iframes} / frames=${total} (~1 every $(echo "scale=1; ${total} / ${iframes}" | bc) frames)"
}

encode() {
  local width="$1" crf="$2"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$SOURCE" \
    -vf "fps=${FPS},scale='min(${width},iw)':-2:flags=lanczos" \
    -an \
    -c:v libx264 \
    -preset slow \
    -crf "${crf}" \
    -profile:v high \
    -level 4.1 \
    -pix_fmt yuv420p \
    -g "${GOP}" \
    -keyint_min "${GOP}" \
    -sc_threshold 0 \
    -movflags +faststart \
    "$OUT_VIDEO"
}

echo "==> Source: ${SOURCE}"
probe "$SOURCE"
SRC_MB=$(file_mb "$SOURCE")
echo "source_size=${SRC_MB} MB"
echo

echo "==> Encoding H.264 (width<=${MAX_WIDTH}, crf=${CRF})..."
encode "$MAX_WIDTH" "$CRF"
OUT_MB=$(file_mb "$OUT_VIDEO")
echo "output_size=${OUT_MB} MB"

# Escalate if over the ceiling: 1) crf 22, then 2) width 1600.
if (( $(echo "${OUT_MB} > ${MAX_MB}" | bc -l) )); then
  echo "==> ${OUT_MB} MB > ${MAX_MB} MB — re-encoding at crf 22..."
  encode "$MAX_WIDTH" 22
  OUT_MB=$(file_mb "$OUT_VIDEO")
  echo "output_size=${OUT_MB} MB"
fi
if (( $(echo "${OUT_MB} > ${MAX_MB}" | bc -l) )); then
  echo "==> still too big — re-encoding at width 1600, crf 22..."
  encode 1600 22
  OUT_MB=$(file_mb "$OUT_VIDEO")
  echo "output_size=${OUT_MB} MB"
fi

echo
echo "==> Poster (first frame, WebP <=${MAX_WIDTH}px)..."
POSTER_PNG="${OUT_DIR}/.hero-poster-frame.png"
ffmpeg -y -hide_banner -loglevel error \
  -i "$SOURCE" \
  -vf "scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos" \
  -frames:v 1 \
  "$POSTER_PNG"

# Portable WebP: prefer ffmpeg libwebp, then cwebp, then macOS sips.
if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libwebp; then
  ffmpeg -y -hide_banner -loglevel error -i "$POSTER_PNG" \
    -c:v libwebp -quality 82 -compression_level 6 "$OUT_POSTER"
elif command -v cwebp >/dev/null 2>&1; then
  cwebp -quiet -q 82 "$POSTER_PNG" -o "$OUT_POSTER"
elif command -v sips >/dev/null 2>&1; then
  sips -s format webp -s formatOptions 80 "$POSTER_PNG" --out "$OUT_POSTER" >/dev/null
else
  echo "ERROR: no WebP encoder (libwebp/cwebp/sips)"; exit 1
fi
rm -f "$POSTER_PNG"
POSTER_KB=$(echo "scale=0; $(wc -c < "$OUT_POSTER") / 1024" | bc)
echo "poster_size=${POSTER_KB} KB"

echo
echo "==================== RESULT ===================="
echo "Source : ${SOURCE} (${SRC_MB} MB)"
probe "$SOURCE" | sed 's/^/  src /'
echo "Output : ${OUT_VIDEO} (${OUT_MB} MB)"
probe "$OUT_VIDEO" | sed 's/^/  out /'
echo "  out $(keyframe_report "$OUT_VIDEO")"
echo "Poster : ${OUT_POSTER} (${POSTER_KB} KB)"
echo "================================================"
