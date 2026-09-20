#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
extension_dir="$project_root/extension"
output_dir="$project_root/safari/IlliniDaySafari"

if [[ ! -f "$extension_dir/manifest.json" ]]; then
  echo "Missing extension manifest: $extension_dir/manifest.json" >&2
  exit 1
fi

packager=""
for candidate in safari-web-extension-packager safari-web-extension-converter; do
  if command -v xcrun >/dev/null 2>&1 && xcrun --find "$candidate" >/dev/null 2>&1; then
    packager="$candidate"
    break
  fi
done

if [[ -z "$packager" ]]; then
  cat >&2 <<'EOF'
Safari packaging needs the full Xcode command-line tools.
Install Xcode, accept its license, then run:

  npm run build:safari

The generated Xcode project will be written to safari/IlliniDaySafari/.
EOF
  exit 2
fi

rm -rf "$output_dir"
mkdir -p "$(dirname "$output_dir")"
xcrun "$packager" "$extension_dir" \
  --project-location "$output_dir" \
  --app-name "Illini Day Canvas Reader" \
  --bundle-identifier "com.chocolatte-tracy.illiniday.canvasreader" \
  --swift

echo "Safari project generated at $output_dir"
