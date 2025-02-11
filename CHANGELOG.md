# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/) and uses the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [1.0.0] - 2025-02-11

### Added

- **Welcome Screen** displaying a welcome message, a “Create New Connection” button, and a setup guide.
- **Connection Creation/Editing Form** supporting username, password, and timeout (SASL).
- **Disclaimer** about key management limitations when using SASL authentication.
- **Enhanced Key Listing** with a search bar (including regex support) and a selectable number of displayed results.
- **Auto-Update Functionality** to automatically refresh the key list.
- **Data Visualization Modal** for detailed inspection of key values (e.g., JSON).
- **Data Formats (TEXT, JSON, etc.)** when creating/editing keys.
- **Statistics Screen** showing Memcached server metrics (uptime, connections, GET/SET, memory usage, slabs, etc.).

### Changed

- **Project Organization**:
  - Added a routing system to improve navigation structure.
  - Reconfigured folders and build settings to avoid conflicts.
- **User Experience (UI/UX)**:
  - Introduced new icons, logos, and layouts compatible with the application theme.
  - Streamlined the flow for creating, editing, and viewing keys.
  - Removed extra loading steps during auto-updates, making the process smoother.

### Fixed

- **More Robust Error Handling**, preventing application crashes with invalid inputs.
- **Script path** and build process corrections.
- **Window Title Handling** so it is not improperly displayed in browser environments.
- **Form Value Type Conversion**, ensuring consistent data submission (e.g., numeric vs. string values).
- **Local Storage** switched from `localStorage` to `localForage` to bypass limitations and prevent data loss.
- **Statistics Fields** adjustments, fixing calculations for requests per second and size metrics.

### Removed

- _(No existing features from the previous version were removed; any items not present before are simply not included.)_

## [0.1.0] - 2025-02-02

### Added

- **Initial Release**:
  - Complete release of MemGUI.
  - Graphical user interface for managing Memcached databases and cache.
  - Key management functionalities:
    - Create, edit, and delete keys.
    - Display key details such as key name, stored value, TTL, and content size.
  - Multi-server support for connecting to multiple Memcached instances simultaneously.
  - User-friendly interface with both light and dark modes.
  - Navigation improvements for efficient key and server management.
  - Visual examples with screenshots for connection screen, key list, key creating, key editing, and switch connection.
