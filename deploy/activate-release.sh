#!/usr/bin/env bash
set -euo pipefail

base_dir="/srv/parmelae-bot"
release_id=""
service_name="parmelae-bot"
keep_releases=5

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-dir)
      base_dir="${2:-}"
      shift 2
      ;;
    --release)
      release_id="${2:-}"
      shift 2
      ;;
    --service)
      service_name="${2:-}"
      shift 2
      ;;
    --keep-releases)
      keep_releases="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$release_id" ]]; then
  echo "Missing --release value." >&2
  exit 1
fi

export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun not found in PATH." >&2
  exit 1
fi

release_dir="${base_dir}/releases/${release_id}"
current_link="${base_dir}/current"
shared_dir="${base_dir}/shared"
shared_env="${shared_dir}/.env"
shared_db="${shared_dir}/sqlite.db"
shared_backups="${shared_dir}/backups"
desired_bun_version="$(tr -d '[:space:]' < "${release_dir}/.bun-version")"
previous_release=""

if [[ ! -d "$release_dir" ]]; then
  echo "Release directory does not exist: ${release_dir}" >&2
  exit 1
fi

mkdir -p "${base_dir}/releases" "${shared_backups}"

if [[ ! -f "$shared_env" ]]; then
  echo "Missing shared env file: ${shared_env}" >&2
  exit 1
fi

if [[ ! -f "$shared_db" ]]; then
  echo "Missing shared database: ${shared_db}" >&2
  exit 1
fi

if [[ -z "$desired_bun_version" ]]; then
  echo "Missing Bun version in ${release_dir}/.bun-version" >&2
  exit 1
fi

if [[ -L "$current_link" || -d "$current_link" ]]; then
  previous_release="$(readlink -f "$current_link" || true)"
fi

set -a
. "$shared_env"
set +a

: "${DATABASE_URL:=file:${shared_db}}"
: "${BACKUP_DIR:=${shared_backups}}"
export DATABASE_URL BACKUP_DIR

current_bun_version="$(bun --version)"
if [[ "$current_bun_version" != "$desired_bun_version" ]]; then
  echo "Upgrading Bun from ${current_bun_version} to ${desired_bun_version}..."
  curl -fsSL https://bun.sh/install | bash -s -- "bun-v${desired_bun_version}"
  export PATH="$HOME/.bun/bin:$PATH"
  echo "Using Bun $(bun --version)"
fi

cd "$release_dir"
bun install --frozen-lockfile --production
bun scripts/backup/backup-database.ts
bun run migrate-prod

ln -sfn "$release_dir" "$current_link"

restart_service() {
  sudo -n systemctl restart "$service_name"
}

service_is_active() {
  sudo -n systemctl is-active "$service_name" | grep -q '^active$'
}

show_recent_logs() {
  sudo -n journalctl -u "$service_name" -n 50 --no-pager || true
}

wait_for_service() {
  local attempt
  for attempt in $(seq 1 20); do
    if service_is_active; then
      return 0
    fi
    sleep 1
  done

  return 1
}

prune_old_releases() {
  mapfile -t all_releases < <(ls -1dt "${base_dir}"/releases/* 2>/dev/null || true)
  local release_count=0

  for release_path in "${all_releases[@]}"; do
    release_count=$((release_count + 1))
    if (( release_count > keep_releases )); then
      rm -rf "$release_path"
    fi
  done
}

if restart_service && wait_for_service; then
  bun scripts/backup/cleanup-backups.ts || true
  prune_old_releases || true
  echo "Activated release ${release_id}."
  exit 0
fi

echo "Deploy failed; attempting rollback." >&2
show_recent_logs

if [[ -n "$previous_release" && -d "$previous_release" ]]; then
  ln -sfn "$previous_release" "$current_link"
  sudo -n systemctl restart "$service_name" || true
fi

exit 1
