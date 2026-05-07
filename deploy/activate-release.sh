#!/usr/bin/env bash
set -euo pipefail

base_dir="/srv/parmelae-bot"
release_id=""
service_name="parmelae-bot"
keep_releases=5
executable_path="parmelae-bot"

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

if [[ ! "$release_id" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid release value: ${release_id}" >&2
  exit 1
fi

release_dir="${base_dir}/releases/${release_id}"
current_link="${base_dir}/current"
shared_dir="${base_dir}/shared"
shared_env="${shared_dir}/.env"
shared_db="${shared_dir}/sqlite.db"
shared_backups="${shared_dir}/backups"
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

if [[ ! -x "${release_dir}/${executable_path}" ]]; then
  echo "Compiled executable is missing or not executable: ${release_dir}/${executable_path}" >&2
  exit 1
fi

if ! grep -qw avx2 /proc/cpuinfo; then
  echo "Server CPU does not support AVX2, but this release uses bun-linux-x64-modern." >&2
  exit 1
fi

expected_exec_start="${current_link}/${executable_path}"
actual_exec_start="$(systemctl show "$service_name" --property=ExecStart --value 2>/dev/null || true)"

if [[ "$actual_exec_start" != *"$expected_exec_start"* ]]; then
  echo "Systemd service ${service_name} does not run ${expected_exec_start}." >&2
  echo "Current ExecStart: ${actual_exec_start:-<unavailable>}" >&2
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

cd "$release_dir"
./"${executable_path}" deploy backup
./"${executable_path}" deploy migrate

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
  ./"${executable_path}" deploy cleanup-backups || true
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
