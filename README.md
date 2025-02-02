# MemGUI

<p align="center">
  <img src="https://raw.githubusercontent.com/lucassm02/mem-gui/main/assets/mem-gui.svg" alt="MemGUI Logo" width="160" />
</p>

**MemGUI** is a graphical user interface (GUI) for managing **Memcached** databases and cache. It provides an intuitive experience for listing, creating, editing, and deleting keys, overcoming some of Memcached's limitations. It also allows users to view key details such as **content size and TTL** and supports multiple simultaneous connections to different servers.

## 📌 Features

- **Complete Key Management**
  - Create new keys.
  - Edit existing keys (value and expiration time).
  - Delete keys from the cache.
  - View stored keys with details:
    - Key name.
    - Stored value.
    - Expiration time (TTL).
    - Content size.

- **Multi-Server Support**
  - Connect to multiple Memcached instances.
  - Seamlessly switch between active connections without closing them.

- **User-Friendly Interface**
  - Light and dark mode for an enhanced user experience.
  - Simplified navigation for efficient key and server management.

## 🖼 Screenshots

### Connection Screen

![Connection Screen](./screenshots/screnshot-00.png)

### Key List

![Key List](./screenshots/screnshot-01.png)
![Key List](./screenshots/screnshot-02.png)
![Key List](./screenshots/screnshot-05.png)

### Key Creating

![Key List](./screenshots/screnshot-04.png)

### Key Editing

![Key Editing](./screenshots/screnshot-03.png)

### Switch Connection

![Switch Connection](./screenshots/screnshot-06.png)

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
