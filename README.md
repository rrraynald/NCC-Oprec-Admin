# OPREC Admin NCC Modul 3 - System Monitoring with Prometheus and Grafana

- **Nama:** Raynald Ramadhani Fachriansyah
- **NRP:** 5025241020

## Deskripsi Soal

Pada tugas modul 3 ini, kami diminta untuk mengimplementasikan sistem monitoring menggunakan Prometheus dan Grafana, dengan detail sebagai berikut:

1. Menyiapkan Prometheus sebagai tools monitoring dan metrics collection.
2. Menyiapkan Grafana sebagai tools visualisasi data.
3. Mengkonfigurasi scraping metrics dari target menggunakan Node Exporter.
4. Membuat custom dashboard di Grafana tanpa menggunakan template bawaan.
5. Menambahkan sistem alerting yang terintegrasi ke Discord.

## Tech Stack

| Teknologi           | Kegunaan                                              |
| ------------------- | ----------------------------------------------------- |
| **Prometheus**      | Metrics collection dan time-series database           |
| **Grafana**         | Visualisasi data dan alerting dashboard               |
| **Node Exporter**   | Mengekspos metrics level OS (CPU, RAM, disk, network) |
| **Discord Webhook** | Notifikasi alert eksternal                            |
| **DigitalOcean**    | VPS untuk tools deployment                            |

## Arsitektur Sistem Monitoring

Sistem monitoring dibangun menggunakan dua VPS DigitalOcean yang saling terhubung melalui private network:

![alt text](<media/Untitled - Frame 3.jpg>)

| VPS               | Public IP       | Private IP | Komponen                   | Spec             |
| ----------------- | --------------- | ---------- | -------------------------- | ---------------- |
| oprec-admin       | 146.190.111.171 | 10.104.0.3 | Prometheus + Node Exporter | 8GB RAM / 2 vCPU |
| grafana-dashboard | 174.138.31.155  | 10.104.0.2 | Grafana + Node Exporter    | 1GB RAM / 1 vCPU |

## Alur Monitoring

Alur kerja sistem monitoring secara keseluruhan adalah sebagai berikut:

```
Node Exporter (kedua VPS)
    │
    │  expose metrics di port 9100
    ▼
Prometheus (oprec-admin)
    │
    │  scrape setiap 15 detik
    │
    ▼
Grafana (grafana-dashboard)
    │
    │  query data dari Prometheus dan
    │  tampilkan di dashboard
    ▼
Alerting -> Discord Webhook
    │
    │  kirim notifikasi saat melebihi threshold
    ▼
Discord Channel
```

## Penjelasan Alur Pengerjaan

### 1. Instalasi Prometheus (VPS oprec-admin)

Download dan install Prometheus versi 2.52.0:

```bash
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.linux-amd64.tar.gz
tar xvf prometheus-*.tar.gz
cd prometheus-*.linux-amd64

sudo mv prometheus /usr/local/bin/
sudo mv promtool /usr/local/bin/

sudo mkdir -p /etc/prometheus
sudo mkdir -p /var/lib/prometheus

sudo cp prometheus.yml /etc/prometheus/

sudo useradd --no-create-home --shell /bin/false prometheus
sudo chown -R prometheus:prometheus /etc/prometheus
sudo chown -R prometheus:prometheus /var/lib/prometheus
```

Buat systemd service `/etc/systemd/system/prometheus.service`:

```ini
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.retention.time=3d \
  --web.listen-address=0.0.0.0:9090

[Install]
WantedBy=multi-user.target
```

Run Prometheus:

```bash
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

Hasil Prometheus Running:

![alt text](<media/Screenshot 2026-05-01 at 23.11.32.png>)

### 2. Instalasi Node Exporter (Kedua VPS)

Node Exporter dipasang di **kedua VPS** agar keduanya bisa dimonitor oleh Prometheus.

```bash
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.8.1/node_exporter-1.8.1.linux-amd64.tar.gz
tar xvf node_exporter-*.tar.gz
cd node_exporter-*.linux-amd64

sudo mv node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
```

Buat systemd service `/etc/systemd/system/node_exporter.service`:

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=default.target
```

Jalankan Node Exporter:

```bash
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### 3. Konfigurasi Prometheus Scraping

Edit konfigurasi Prometheus di `/etc/prometheus/prometheus.yml` untuk menambahkan target scraping dari kedua VPS:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node"
    static_configs:
      - targets: ["localhost:9100", "10.104.0.2:9100"]
```

Konfigurasi ini membuat Prometheus scrape metrics dari:

- `localhost:9090` - Prometheus itu sendiri
- `localhost:9100` - Node Exporter di VPS oprec-admin
- `10.104.0.2:9100` - Node Exporter di VPS grafana-dashboard (via private IP)

Hasil konfigurasi Prometheus:

![alt text](<media/Screenshot 2026-05-01 at 23.17.57.png>)
![alt text](<media/Screenshot 2026-05-01 at 23.17.59.png>)

Restart Prometheus setelah mengubah konfigurasi:

```bash
sudo systemctl restart prometheus
```

### 4. Instalasi Grafana (VPS grafana-dashboard)

Install Grafana di VPS grafana-dashboard:

```bash
sudo apt-get install -y apt-transport-https wget gnupg

sudo mkdir -p /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/grafana.asc https://apt.grafana.com/gpg-full.key
sudo chmod 644 /etc/apt/keyrings/grafana.asc

echo "deb [signed-by=/etc/apt/keyrings/grafana.asc] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

sudo apt-get update
sudo apt-get install -y grafana
```

Jalankan Grafana:

```bash
sudo systemctl daemon-reload
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

Hasil Grafana Running:

![alt text](<media/Screenshot 2026-05-02 at 00.20.05.png>)

Hubungkan Grafana ke Prometheus sebagai data source:

1. Akses Grafana di `http://174.138.31.155:3000`
2. Login dengan credential default (`admin` / `admin`), kemudian setup password baru
3. Navigasi ke **Connections** -> **Data Sources** -> **Add data source**
4. Pilih **Prometheus**
5. Masukkan Prometheus server URL: `http://10.104.0.3:9090`
6. Klik **Save & Test**
   Grafana terhubung ke Prometheus menggunakan **private IP** (`10.104.0.3`) untuk menjaga keamanan - Prometheus tidak perlu di-expose ke internet publik.

![alt text](<media/Screenshot 2026-05-02 at 00.21.34.png>)

### 6. Custom Dashboard

Dashboard dibuat secara manual tanpa menggunakan template bawaan. Setiap panel dibuat menggunakan query PromQL custom.

#### Panel 1 - CPU Usage (%)

Menampilkan persentase penggunaan CPU di kedua server menggunakan visualisasi Gauge.

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    100 - (avg by(instance)(rate(node_cpu_seconds_total{instance="localhost:9100", mode="idle"}[5m])) * 100),
    "server", "oprec-admin (prometheus)", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    100 - (avg by(instance)(rate(node_cpu_seconds_total{instance="10.104.0.2:9100", mode="idle"}[5m])) * 100),
    "server", "grafana-dashboard", "instance", ".*"
  )
)
```

Query ini menghitung persentase CPU yang sibuk dengan cara mengambil 100% dikurangi rata-rata waktu idle CPU dalam interval 5 menit. Fungsi `rate()` menghitung perubahan per detik, `avg by(instance)` merata-ratakan semua core CPU, dan `label_replace()` digunakan untuk memberi label nama server yang lebih readable.

![alt text](<media/Screenshot 2026-05-02 at 00.28.25.png>)

#### Panel 2 - Memory Usage (%)

Menampilkan persentase penggunaan RAM.

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100,
    "server", "oprec-admin", "instance", "localhost:9100"
  )
)
or
sum by(server)(
  label_replace(
    (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100,
    "server", "grafana-dashboard", "instance", "10.104.0.2:9100"
  )
)
```

Menghitung rasio antara memori yang terpakai (total dikurangi available) terhadap total memori, lalu dikalikan 100 untuk mendapatkan persentase.

![alt text](<media/Screenshot 2026-05-02 at 00.28.36.png>)

#### Panel 3 - Disk Usage (%)

Menampilkan persentase penggunaan disk pada mount point root (`/`).

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    (1 - node_filesystem_avail_bytes{instance="localhost:9100", mountpoint="/"} / node_filesystem_size_bytes{instance="localhost:9100", mountpoint="/"}) * 100,
    "server", "oprec-admin", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    (1 - node_filesystem_avail_bytes{instance="10.104.0.2:9100", mountpoint="/"} / node_filesystem_size_bytes{instance="10.104.0.2:9100", mountpoint="/"}) * 100,
    "server", "grafana-dashboard", "instance", ".*"
  )
)
```

![alt text](<media/Screenshot 2026-05-02 at 00.28.45.png>)

#### Panel 4 - Network Traffic (In/Out)

Menampilkan traffic jaringan masuk (receive) dan keluar (transmit) untuk kedua server.

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    rate(node_network_receive_bytes_total{instance="localhost:9100", device="eth0"}[5m]),
    "server", "oprec-admin (in)", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    rate(node_network_receive_bytes_total{instance="10.104.0.2:9100", device="eth0"}[5m]),
    "server", "grafana-dashboard (in)", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    rate(node_network_transmit_bytes_total{instance="localhost:9100", device="eth0"}[5m]),
    "server", "oprec-admin (out)", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    rate(node_network_transmit_bytes_total{instance="10.104.0.2:9100", device="eth0"}[5m]),
    "server", "grafana-dashboard (out)", "instance", ".*"
  )
)
```

Menggunakan `rate()` pada counter bytes yang dikirim dan diterima melalui interface `eth0` untuk mendapatkan throughput per detik dalam interval 5 menit.

![alt text](<media/Screenshot 2026-05-02 at 00.28.49.png>)

#### Panel 5 - System Uptime

Menampilkan berapa lama server sudah berjalan sejak terakhir boot.

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    node_time_seconds{instance="localhost:9100"} - node_boot_time_seconds{instance="localhost:9100"},
    "server", "oprec-admin", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    node_time_seconds{instance="10.104.0.2:9100"} - node_boot_time_seconds{instance="10.104.0.2:9100"},
    "server", "grafana-dashboard", "instance", ".*"
  )
)
```

![alt text](<media/Screenshot 2026-05-02 at 00.28.53.png>)

#### Panel 6 - Load Average (1m)

Menampilkan load average 1 menit — indikator seberapa sibuk server.

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    node_load1{instance="localhost:9100"},
    "server", "oprec-admin", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    node_load1{instance="10.104.0.2:9100"},
    "server", "grafana-dashboard", "instance", ".*"
  )
)
```

![alt text](<media/Screenshot 2026-05-02 at 00.28.57.png>)

#### Panel 7 - RAM Total

Menampilkan total RAM yang tersedia pada masing-masing server.

**Query PromQL:**

```promql
sum by(server)(
  label_replace(
    node_memory_MemTotal_bytes{instance="localhost:9100"},
    "server", "oprec-admin", "instance", ".*"
  )
)
or
sum by(server)(
  label_replace(
    node_memory_MemTotal_bytes{instance="10.104.0.2:9100"},
    "server", "grafana-dashboard", "instance", ".*"
  )
)
```

![alt text](<media/Screenshot 2026-05-02 at 00.29.02.png>)

### 7. Konfigurasi Firewall (ufw)

Firewall dikonfigurasi menggunakan ufw dengan **source restriction** untuk keamanan:

**oprec-admin:**

```bash
sudo ufw allow 22/tcp                                    # SSH
sudo ufw allow from 10.104.0.2 to any port 9090          # Prometheus hanya dari Grafana
sudo ufw allow from 10.104.0.2 to any port 9100          # Node Exporter hanya dari Grafana
```

**grafana-dashboard:**

```bash
sudo ufw allow 22/tcp                                    # SSH
sudo ufw allow 3000/tcp                                  # Grafana dashboard (publik)
sudo ufw allow from 10.104.0.3 to any port 9100          # Node Exporter hanya dari Prometheus
```

Dengan konfigurasi ini:

- Prometheus (port 9090) **tidak di-expose ke publik**, hanya bisa diakses dari VPS Grafana via private IP
- Node Exporter (port 9100) hanya bisa diakses oleh VPS pasangannya
- Grafana (port 3000) menjadi satu-satunya entry point yang bisa diakses dari internet

### 8. Alerting System

#### Konfigurasi Discord Webhook

Grafana dikonfigurasi untuk mengirim alert ke Discord melalui webhook:

1. Buat Discord server dan channel untuk alert
2. Buat webhook di channel tersebut (**Edit Channel** -> **Integrations** -> **Webhooks**)
3. Di Grafana, navigasi ke **Alerting** -> **Contact Points** -> **Add contact point**
4. Pilih integration **Discord** dan masukkan webhook URL
5. Set sebagai default contact point di **Notification Policies**

![alt text](<media/Screenshot 2026-05-02 at 00.33.10.png>)

Dibuat 4 alert rules dengan threshold sebagai berikut:

| Alert Rule           | Query PromQL                                                                                           | Threshold | Pending Period |
| -------------------- | ------------------------------------------------------------------------------------------------------ | --------- | -------------- |
| High CPU Usage       | `100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`                        | > 80%     | 1m             |
| High Memory Usage    | `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`                              | > 80%     | 1m             |
| High Disk Usage      | `(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100` | > 90%     | 1m             |
| High Network Traffic | `rate(node_network_receive_bytes_total{device="eth0"}[5m])`                                            | > 2MB/s   | 1m             |

![alt text](<media/Screenshot 2026-05-02 at 00.34.18.png>)

### 9. Simulasi Anomali & Testing Alert

#### (A) Stress Test CPU

Menggunakan tool `stress` untuk membebankan CPU di VPS grafana-dashboard:

```bash
sudo apt install stress -y
stress --cpu 1 --timeout 300
```

Hasilnya CPU melonjak hingga 100% dan alert **High CPU Usage** berhasil firing, mengirim notifikasi ke Discord.

Hasil Test:

![alt text](<media/Screenshot 2026-05-02 at 00.41.05.png>)
![alt text](<media/Screenshot 2026-05-02 at 00.43.56.png>)

#### (B) Stress Test Memory

```bash
stress --vm 1 --vm-bytes 200M --timeout 300
```

Alert **High Memory Usage** berhasil firing pada 84.7% dan mengirim notifikasi ke Discord. Setelah stress test selesai, alert otomatis resolved.

Hasil Test:

![alt text](<media/Screenshot 2026-05-02 at 00.45.18.png>)
![alt text](<media/Screenshot 2026-05-02 at 00.48.31.png>)
![alt text](<media/Screenshot 2026-05-02 at 01.00.43.png>)

#### (C) Stress Test Disk

```bash
dd if=/dev/zero of=/tmp/bigfile bs=1M count=120000
```

Alert **High Disk Usage** berhasil firing pada 99.98%. Setelah file dihapus, alert resolved.

```bash
rm /tmp/bigfile
```

Hasil Test:

![alt text](<media/Screenshot 2026-05-02 at 00.59.33.png>)
![alt text](<media/Screenshot 2026-05-02 at 01.02.06.png>)
![alt text](<media/Screenshot 2026-05-02 at 01.05.19.png>)
