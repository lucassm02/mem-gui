# MemGUI - Memcached GUI Client

<p align="center">
  <img src="https://raw.githubusercontent.com/lucassm02/memgui/main/asset/images/logo-white.svg" alt="MemGUI Memcached GUI client logo" width="160" />
</p>

[![Latest Release](https://img.shields.io/github/v/release/lucassm02/memgui?color=blue&label=Download)](https://github.com/lucassm02/memgui/releases)
[![License: Non-Commercial Use Only](https://img.shields.io/badge/license-NCU-orange.svg)](LICENCE.md)

Website: <https://lucassm02.github.io/memgui/>

MemGUI is a desktop GUI client for Memcached. Manage keys, monitor stats, run bulk operations, and use a custom search DSL with query history to move fast across local, staging, or production servers. Connect securely with SASL or SSH without the CLI.

## Latest Release Highlights (v1.3.1)

- Custom search DSL with extensions and export filtering
- Query history for quick reuse of searches
- Threaded key search for faster, responsive results
- Help button and connection reactivation flow
- Fallback language support and translation fixes

## Memcached GUI Client Features

- Key management for Memcached (create, edit JSON or text, delete, inspect)
- Custom search DSL for key/value filters, ordering, and limits
- Query history to reuse recent searches quickly
- Threaded key search for responsive filtering
- Export filtering by DSL for targeted dumps
- Dump import/export for backup and migration
- SSH connections with host key verification
- Storage encryption for local data and SSH secrets
- Bulk delete with confirmation to avoid accidental data loss
- Multi-server connections with inline editing and quick switching
- SASL authentication support for secured Memcached instances
- Auto-refresh with live key counts
- Server statistics (uptime, memory usage, cache hits, slabs)
- Update notices and auto-update availability for desktop builds
- Multi-language UI with a persistent language selector and fallback language

## Quick Start

1. Download the latest build from <https://github.com/lucassm02/memgui/releases>
2. Choose portable (unpacked) or installer
3. Launch MemGUI and add your Memcached connection
4. Manage keys, search, and monitor stats in the GUI

## Documentation

- Usage guide and full feature walkthrough: docs/guide.md
- Screenshots gallery: docs/screenshots/

## Download

Get the latest build from the Releases page: <https://github.com/lucassm02/memgui/releases>

Release v1.3.1 adds a custom search DSL, query history, threaded key search, and export filtering.

## Contributing

While MemGUI is licensed for non-commercial use, feedback and collaboration are welcome. Open an issue for bugs or feature requests, or submit a pull request with improvements.

## License

This project is licensed under the Non-Commercial Use Only License. You are granted a limited, non-exclusive, and non-transferable license to use this software for personal, educational, or non-commercial research purposes only. Commercial use - including selling, offering paid services, or integrating this software into commercial products - is strictly prohibited. For full details, see LICENCE.md.
