#!/usr/bin/env bash
# ClipSD installer for Linux (x86-64, glibc 2.35 or newer). One command, no sudo:
#   curl -fsSL https://clipsd.github.io/install.sh | bash
# Extra arguments go to the install.sh of the archive:  curl -fsSL https://clipsd.github.io/install.sh | bash -s -- --force-replace-dev
#
# What it does: reads the version from https://clipsd.github.io/channel/stable/latest.json (python3, no jq; without python3 it uses the
# version written here at build time: 1.31.2), downloads the archive from GitHub Releases and SHA256SUMS from this
# site, checks the SHA-256 (a mismatch stops everything), unpacks into a temporary folder under ~/.cache, runs the
# install.sh from the archive (installs for the current user into ~/.local/share/clipsd) and removes the temporary folder.
# Copyright (C) 2026 Sergey Dayneko. SPDX-License-Identifier: GPL-3.0-or-later
#
# For tests: CLIPSD_BASE (site address) and CLIPSD_RELEASE_BASE (the folder that holds v<version>/<file>) replace the
# built-in addresses.
#
# The whole script sits in main(), and the last line calls it: bash reads everything before running anything, so nothing
# that is started from here can swallow the rest of the script from the pipe.
set -euo pipefail

main() {
  local BASE="${CLIPSD_BASE:-https://clipsd.github.io}"
  local REL="${CLIPSD_RELEASE_BASE:-https://github.com/clipsd/clipsd/releases/download}"
  local FALLBACK_VERSION="1.31.2"
  local MIN_GLIBC="2.35"

  # --- messages: Russian when the terminal language is Russian, else English ---------------------------------
  local loc="${CLIPSD_LANG:-${LANGUAGE:-${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}}}" RU=0
  case "${loc%%:*}" in ru|ru_*|ru.*) RU=1 ;; esac
  t() { if [ "$RU" = 1 ]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }
  say() { printf '==> %s\n' "$(t "$1" "$2")"; }
  die() { printf '!! %s\n' "$(t "$1" "$2")" >&2; exit 1; }

  # --- the machine: x86-64 and glibc 2.35 or newer -------------------------------------------------------------
  local arch; arch="$(uname -m 2>/dev/null || true)"
  case "$arch" in
    x86_64|amd64) ;;
    *) die "ClipSD пока собран только для 64-разрядных x86 (x86-64), у вас: ${arch:-неизвестно}. ARM (Raspberry Pi и другие) пока не поддерживается. Подробности: $BASE/" \
           "ClipSD is built only for 64-bit x86 (x86-64) so far, this machine is: ${arch:-unknown}. ARM (Raspberry Pi and others) is not supported yet. Details: $BASE/" ;;
  esac
  local glibc=""
  if command -v getconf >/dev/null 2>&1; then glibc="$(getconf GNU_LIBC_VERSION 2>/dev/null | awk '{print $2}' || true)"; fi
  if [ -z "$glibc" ] && command -v ldd >/dev/null 2>&1; then
    local first; first="$(ldd --version 2>&1 | head -1 || true)"
    case "$first" in
      *musl*) die "Найдена musl (например Alpine). ClipSD нужна glibc $MIN_GLIBC или новее. Подробности: $BASE/" \
                  "Found musl (for example Alpine). ClipSD needs glibc $MIN_GLIBC or newer. Details: $BASE/" ;;
    esac
    glibc="$(printf '%s' "$first" | awk '{print $NF}')"
  fi
  case "$glibc" in
    [0-9]*.[0-9]*) ;;
    *) die "Не удалось определить версию glibc. ClipSD нужна glibc $MIN_GLIBC или новее (Ubuntu 22.04+, Debian 12+, Fedora 36+ и новее). Подробности: $BASE/" \
           "Could not find out the glibc version. ClipSD needs glibc $MIN_GLIBC or newer (Ubuntu 22.04+, Debian 12+, Fedora 36+ and newer). Details: $BASE/" ;;
  esac
  if [ "$(printf '%s\n%s\n' "$MIN_GLIBC" "$glibc" | sort -V | head -1)" != "$MIN_GLIBC" ]; then
    die "У вас glibc $glibc, а ClipSD нужна $MIN_GLIBC или новее (Ubuntu 22.04+, Debian 12+, Fedora 36+ и новее; Ubuntu 20.04, Debian 11 и CentOS 7 не подходят). Подробности: $BASE/" \
        "This system has glibc $glibc, ClipSD needs $MIN_GLIBC or newer (Ubuntu 22.04+, Debian 12+, Fedora 36+ and newer; Ubuntu 20.04, Debian 11 and CentOS 7 do not fit). Details: $BASE/"
  fi
  command -v curl >/dev/null 2>&1 || die "Нужна программа curl. Поставьте её средствами системы и повторите." \
                                          "curl is needed. Install it with your system's package manager and run this again."
  command -v sha256sum >/dev/null 2>&1 || die "Нужна программа sha256sum (пакет coreutils)." "sha256sum is needed (package coreutils)."
  command -v tar >/dev/null 2>&1 || die "Нужна программа tar." "tar is needed."

  # --- the version: from the update channel, else the one written at build time -------------------------------
  local version=""
  if command -v python3 >/dev/null 2>&1; then
    version="$(curl -fsSL --max-time 20 "$BASE/channel/stable/latest.json" 2>/dev/null \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])' 2>/dev/null || true)"
  fi
  case "$version" in
    [0-9]*.[0-9]*.[0-9]*) ;;
    *) version="$FALLBACK_VERSION" ;;
  esac
  local file="ClipSD-$version-linux-x86_64.tar.gz"
  say "Устанавливаю ClipSD $version" "Installing ClipSD $version"

  # --- a work folder in the cache (not in /tmp: it may live in memory) ---------------------------------------
  local cache="${XDG_CACHE_HOME:-$HOME/.cache}" work
  mkdir -p "$cache"
  work="$(mktemp -d "$cache/clipsd-install.XXXXXX")"
  trap "rm -rf '$work'" EXIT   # expanded now: main() has returned when the trap runs, a local variable would be gone

  say "Скачиваю $file" "Downloading $file"
  curl -fSL --retry 2 --progress-bar -o "$work/$file" "$REL/v$version/$file" \
    || die "Не удалось скачать $REL/v$version/$file. Проверьте интернет или скачайте файл вручную: $BASE/" \
           "Could not download $REL/v$version/$file. Check the internet or download the file by hand: $BASE/"
  curl -fsSL --retry 2 -o "$work/SHA256SUMS" "$BASE/downloads/SHA256SUMS" \
    || die "Не удалось скачать список сумм $BASE/downloads/SHA256SUMS." "Could not download the list of sums $BASE/downloads/SHA256SUMS."

  # --- the check: a missing line or a different sum stops here ------------------------------------------------
  local want got
  want="$(awk -v f="$file" '{n=$2; sub(/^\*/,"",n); if (n==f) {print $1; exit}}' "$work/SHA256SUMS")"
  [ -n "$want" ] || die "В списке сумм нет строки для $file (возможно, сайт ещё не обновлён до версии $version). Повторите позже или установите вручную: $BASE/" \
                        "No line for $file in the list of sums (the site may not be updated to $version yet). Try later or install by hand: $BASE/"
  got="$(sha256sum "$work/$file" | awk '{print $1}')"
  if [ "$got" != "$want" ]; then
    die "Контрольная сумма не совпала: ожидалась $want, получена $got. Файл не распакован и не установлен." \
        "Checksum mismatch: expected $want, got $got. Nothing was unpacked or installed."
  fi
  say "Контрольная сумма совпала" "Checksum OK"

  # --- unpack and run the installer of the archive (all arguments go to it) -------------------------------------
  tar -xzf "$work/$file" -C "$work" || die "Не удалось распаковать архив." "Could not unpack the archive."
  local dir="$work/clipsd-$version"
  [ -f "$dir/install.sh" ] || die "В архиве нет install.sh." "install.sh is missing in the archive."
  say "Запускаю установку (sudo не нужен)" "Running the installer (no sudo needed)"
  ( cd "$dir" && bash ./install.sh "$@" </dev/null )
}

main "$@"
