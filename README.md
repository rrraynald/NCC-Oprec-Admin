# OPREC Admin NCC Modul 2 - CI/CD Pipeline with Jenkins and SonarQube

- **Nama:** Raynald Ramadhani Fachriansyah
- **NRP:** 5025241020

## Deskripsi Soal

Pada tugas modul 2 Lab NCC ini, kami diminta untuk mengimplementasikan CI/CD pipeline menggunakan Jenkins dan SonarQube, dengan detail sebagai berikut:

1. Menyiapkan Jenkins sebagai tools automation.
2. Menyiapkan SonarQube sebagai tools code quality analysis.
3. Menghubungkan Jenkins dengan SonarQube dan membuat pipeline.
4. Fitur opsional: Jenkinsfile pipeline, stage terstruktur dengan Quality Gate, webhook, credential management, build badge, dan optimasi pipeline.

## Tech Stack

| Teknologi             | Kegunaan                                           |
| --------------------- | -------------------------------------------------- |
| **Node.js + Express** | Framework pembuatan sample project                 |
| **Jest + Supertest**  | Testing framework dan HTTP testing library         |
| **Docker**            | Containerization Jenkins dan SonarQube             |
| **Jenkins**           | CI/CD automation server untuk menjalankan pipeline |
| **SonarQube**         | Code quality analysis dan coverage reporting       |
| **DigitalOcean**      | VPS hosting Jenkins dan SonarQube                  |

## Deskripsi Pipeline

Pipeline yang dibuat menggunakan **Jenkinsfile** dengan 5 stage utama yang berjalan secara otomatis setiap kali ada push ke branch `Tugas-2`:

1. **Checkout** - Clone repository dari GitHub
2. **Install Dependencies** - Install package Node.js (`npm install`)
3. **Build & Test (Parallel)** - Verifikasi app bisa di-load dan jalankan 9 test cases secara bersamaan
4. **SonarQube Analysis** - Kirim source code dan coverage report ke SonarQube untuk dianalisis
5. **Quality Gate** - Cek apakah hasil analisis memenuhi standar kualitas. Jika tidak, pipeline gagal.

## Penjelasan Alur Pengerjaan

### 1. Deploy Jenkins dan SonarQube di VPS

Jenkins dan SonarQube dijalankan menggunakan Docker container di VPS (IP: `146.190.111.171`).

Pertama, buat Docker network agar kedua container bisa saling berkomunikasi:

```bash
docker network create cicd-network
```

Deploy SonarQube:

```bash
docker run -d --name sonarqube \
  --restart unless-stopped \
  -p 9000:9000 \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  -v sonarqube_logs:/opt/sonarqube/logs \
  --network cicd-network \
  sonarqube
```

Deploy Jenkins:

```bash
docker run -d --name jenkins \
  --restart unless-stopped \
  -p 8081:8080 \
  -p 50000:50000 \
  -v jenkins_data:/var/jenkins_home \
  --network cicd-network \
  jenkins/jenkins:lts
```

Kedua container berada dalam satu Docker network (`cicd-network`) sehingga bisa saling akses menggunakan nama container sebagai hostname.

Install npm dalam container Jenkins:

```bash
docker exec -u root jenkins bash -c "
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &&
  apt-get install -y nodejs
"
```

### Dokumentasi

![alt text](<media/Screenshot 2026-04-27 at 17.33.55.png>)
![alt text](<media/Screenshot 2026-04-27 at 17.34.41.png>)
![alt text](<media/Screenshot 2026-04-27 at 17.34.56.png>)

Semua container berjalan dan Jenkins serta SonarQube bisa diakses melalui browser.

### 2. Konfigurasi Jenkins

#### 2a. Initial Setup & Install Plugin

Setelah Jenkins diakses di `http://146.190.111.171:8081`, unlock menggunakan initial admin password:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Pilih "Install suggested plugins", lalu buat admin user. Setelah itu install plugin tambahan di **Manage Jenkins -> Plugins -> Available plugins**:

- **SonarQube Scanner** - untuk integrasi dengan SonarQube
- **Embeddable Build Status** - untuk build badge

![alt text](<media/Screenshot 2026-04-27 at 17.39.33.png>)

#### 2b. Add SonarQube Token ke Jenkins Credentials

Token dari SonarQube disimpan di Jenkins sebagai credential agar pipeline bisa mengakses SonarQube tanpa hardcode password.

**Manage Jenkins -> Credentials -> (global) -> Add Credentials:**

- Kind: **Secret text**
- Secret: _(token dari SonarQube)_
- ID: `sonarqube-token`

![alt text](<media/Screenshot 2026-04-27 at 17.43.17.png>)

#### 2c. Konfigurasi SonarQube Server di Jenkins

**Manage Jenkins -> System -> SonarQube servers:**

- Name: `SonarQube`
- Server URL: `http://sonarqube:9000` (menggunakan nama container karena satu Docker network)
- Server authentication token: `sonarqube-token`

![alt text](<media/Screenshot 2026-04-27 at 17.44.08.png>)

#### 2d. Install SonarQube Scanner

**Manage Jenkins -> Tools -> SonarQube Scanner installations:**

- Name: `SonarScanner`
- Install automatically: (Centang latest version)

![alt text](<media/Screenshot 2026-04-27 at 17.46.25.png>)

### 3. Konfigurasi SonarQube

#### 3a. Login dan Generate Token untuk Jenkins

Akses SonarQube di `http://146.190.111.171:9000`, login dengan default credential (`admin`/`admin`), lalu ganti password.

Setelah berhasil, akses **My Account -> Security -> Generate Tokens:**

- Name: `jenkins`
- Type: Global Analysis Token
  Token ini yang disimpan di Jenkins Credentials pada step 2b.

![alt text](<media/Screenshot 2026-04-27 at 17.49.54.png>)

#### 3c. Setup Webhook ke Jenkins

Agar Quality Gate bisa mengirim hasil analisis kembali ke Jenkins, SonarQube perlu webhook.

**Administration -> Configuration -> Webhooks -> Create:**

- Name: `Jenkins`
- URL: `http://jenkins:8080/sonarqube-webhook/`

URL menggunakan port `8080` (port internal container Jenkins, bukan `8081` yang di-expose ke host) karena komunikasi ini terjadi di dalam Docker network.

![alt text](<media/Screenshot 2026-04-27 at 17.51.56.png>)

### 4. Buat Sample Project

Sample project berupa REST API sederhana menggunakan Node.js + Express untuk mencatat notes.

#### Struktur Project

```
NCC-Oprec-Admin/          (branch: Tugas-2)
├── src/
│   ├── index.js                 - API utama (5 endpoint)
│   ├── index.test.js            - 9 test cases
│   ├── package.json
│   ├── sonar-project.properties - konfigurasi SonarQube Scanner
│   └── Jenkinsfile              - pipeline definition
├── media/
└── README.md
```

#### File: [src/index.js](./src/index.js)

```javascript
const express = require("express");
const app = express();
app.use(express.json());

const notes = [];
let idCounter = 1;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create note
app.post("/notes", (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }
  const note = {
    id: idCounter++,
    title,
    content,
    createdAt: new Date().toISOString(),
  };
  notes.push(note);
  res.status(201).json(note);
});

// Get all notes
app.get("/notes", (req, res) => {
  res.json(notes);
});

// Get note by ID
app.get("/notes/:id", (req, res) => {
  const note = notes.find((n) => n.id === parseInt(req.params.id));
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

// Delete note
app.delete("/notes/:id", (req, res) => {
  const index = notes.findIndex((n) => n.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Note not found" });
  notes.splice(index, 1);
  res.status(204).send();
});

// Reset (Testing)
app.delete("/reset", (req, res) => {
  notes.length = 0;
  idCounter = 1;
  res.json({ message: "Reset done" });
});

// // Uncomment fitur berikut untuk trigger code smell, bug, dan vulnerability di SonarQube
// app.get("/notes/search", (req, res) => {
//   var query = req.query.q; // code smell: pakai var
//   var results = [];

//   for (var i = 0; i < notes.length; i++) {
//     // code smell: var
//     if (notes[i].title == query) {
//       // bug: pakai ==, seharusnya ===
//       results.push(notes[i]);
//     }
//   }

//   if (query == undefined) {
//     // bug: ==, seharusnya ===
//     return res.status(400).json({ error: "Query required" });
//   }

//   var password = "admin123"; // vulnerability: hardcoded credential
//   console.log(password); // code smell: console.log di production

//   eval("var x = 1"); // vulnerability: eval

//   res.json(results);
// });

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
```

API memiliki 5 endpoint: health check, create note, get all notes, get note by ID, dan delete note. Data disimpan in-memory (tanpa database) karena fokus utama yang dites adalah pipeline.

#### File: [src/index.test.js](./src/index.test.js)

```javascript
const request = require("supertest");
const app = require("./index");

beforeEach(async () => {
  await request(app).delete("/reset");
});

describe("Health", () => {
  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Notes CRUD", () => {
  test("POST /notes creates a note", async () => {
    const res = await request(app)
      .post("/notes")
      .send({ title: "Test", content: "Hello" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Test");
    expect(res.body.id).toBeDefined();
  });

  test("POST /notes returns 400 without title", async () => {
    const res = await request(app).post("/notes").send({ content: "No title" });
    expect(res.status).toBe(400);
  });

  test("POST /notes returns 400 without content", async () => {
    const res = await request(app).post("/notes").send({ title: "No content" });
    expect(res.status).toBe(400);
  });

  test("GET /notes returns all notes", async () => {
    await request(app).post("/notes").send({ title: "A", content: "aaa" });
    await request(app).post("/notes").send({ title: "B", content: "bbb" });

    const res = await request(app).get("/notes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("GET /notes/:id returns specific note", async () => {
    const created = await request(app)
      .post("/notes")
      .send({ title: "Find", content: "me" });

    const res = await request(app).get(`/notes/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Find");
  });

  test("GET /notes/:id returns 404 for non-existing", async () => {
    const res = await request(app).get("/notes/999");
    expect(res.status).toBe(404);
  });

  test("DELETE /notes/:id deletes a note", async () => {
    const created = await request(app)
      .post("/notes")
      .send({ title: "Delete", content: "me" });

    const res = await request(app).delete(`/notes/${created.body.id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get(`/notes/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  test("DELETE /notes/:id returns 404 for non-existing", async () => {
    const res = await request(app).delete("/notes/999");
    expect(res.status).toBe(404);
  });
});
```

File test menggunakan Jest dan Supertest. Jest menjalankan 9 test cases dan menghasilkan coverage report (`coverage/lcov.info`) yang nantinya dibaca oleh SonarQube.

#### File: [src/sonar-project.properties](./src/sonar-project.properties)

```properties
sonar.projectKey=ncc-app
sonar.projectName=NCC Simple Notes API
sonar.projectVersion=1.0.0

sonar.sources=.
sonar.exclusions=node_modules/**,coverage/**,*.test.js
sonar.tests=.
sonar.test.inclusions=*.test.js

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.sourceEncoding=UTF-8
```

File ini memberitahu SonarQube Scanner: folder mana yang source code (`.` = current directory), mana yang test (`*.test.js`), file mana yang di-exclude (`node_modules`, `coverage`), dan di mana coverage report berada.

### 5. Jenkinsfile (Pipeline)

#### File: [src/Jenkinsfile](./src/Jenkinsfile)

```groovy
pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'SonarScanner'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('src') {
                    sh 'npm install'
                }
            }
        }

        stage('Build & Test') {
            parallel {
                stage('Build') {
                    steps {
                        dir('src') {
                            sh 'node -e "const app = require(\'./index\'); console.log(\'Build OK\')"'
                        }
                    }
                }
                stage('Test') {
                    steps {
                        dir('src') {
                            sh 'npm test'
                        }
                    }
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                dir ('src') {
                    withSonarQubeEnv('SonarQube') {
                        sh "${SCANNER_HOME}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished with status: ${currentBuild.currentResult}"
        }
        success {
            echo 'All stages passed! Code quality verified.'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}
```

Pipeline ini memiliki 5 stage utama: **Checkout, Install Dependencies, Build & Test (parallel), SonarQube Analysis, dan Quality Gate**. Jika Quality Gate gagal, pipeline otomatis berhenti dan dianggap gagal. Dengan penjelasan setiap bagian:

- `agent any` - pipeline berjalan di agent Jenkins manapun yang tersedia.
- `environment` - `SCANNER_HOME` menunjuk ke lokasi SonarQube Scanner yang auto-install.
- `dir('src')` - semua command dijalankan di dalam folder `src/` karena source code ada di sana.
- `parallel` - stage Build dan Test berjalan bersamaan untuk optimasi waktu.
- `withSonarQubeEnv('SonarQube')` - inject credential SonarQube secara otomatis dari Jenkins Credentials.
- `waitForQualityGate abortPipeline: true` - pipeline gagal jika kualitas kode tidak memenuhi standar.

### 6. Penjelasan Integrasi Jenkins dengan SonarQube

Berikut diagram alur integrasi Jenkins dengan SonarQube:

```
┌─────────────────────────────────┐
│           GITHUB                │
│  (repo NCC-Oprec-Admin)         │
│  branch: Tugas-2                │
└──────────┬──────────────────────┘
           │ 1. Push code -> webhook trigger
           ▼
┌─────────────────────────────────┐
│          JENKINS                │
│  (container, port 8081)         │
│                                 │
│  - Clone repo                   │
│  - npm install                  │
│  - npm test (-> coverage report)│
│  - Jalankan sonar-scanner       │──────────┐
│  - Tunggu quality gate result   │◀─────┐   │
└─────────────────────────────────┘      │   │
                                         │   │ 2. Kirim source code +
                                         │   │    coverage report
                                         │   ▼
                              ┌──────────┴────────────────┐
                              │       SONARQUBE           │
                              │  (container, port 9000)   │
                              │                           │
                              │  Analisis:                │
                              │  - Bugs & vulnerabilities │
                              │  - Code smells            │
                              │  - Test coverage %        │
                              │  - Duplicated code %      │
                              │  - Complexity metrics     │
                              │                           │
                              │  3. Webhook callback:     │
                              │     PASS / FAIL           │
                              └───────────────────────────┘
```

### 7. Add and Build Pipeline Job di Jenkins

**New Item -> Pipeline:**

- Name: `ncc-app-pipeline`
- Definition: Pipeline script from SCM
- SCM: Git
- Repository URL: `https://github.com/rrraynald/NCC-Oprec-Admin.git`
- Branch: `*/Tugas-2`
- Script Path: `src/Jenkinsfile`

![alt text](<media/Screenshot 2026-04-27 at 18.02.22.png>)

Setelah pipeline job dibuat, klik "Build Now" untuk menjalankan pipeline. Jenkins akan otomatis clone repo, install dependencies, jalankan test, kirim hasil ke SonarQube, dan cek quality gate.

Dokumentasi pipeline yang berjalan:

![alt text](<media/Screenshot 2026-04-27 at 18.03.59.png>)

### 9. Hasil Analisis Kode di SonarQube

Setelah pipeline sukses, hasil analisis dapat dilihat di dashboard SonarQube (`http://146.190.111.171:9000`):

![alt text](<media/Screenshot 2026-04-27 at 18.05.00.png>)

Metrics yang ditampilkan:

- **Issues** - jumlah bugs, vulnerabilities, dan code smells yang ditemukan
- **Coverage** - persentase kode yang tercover oleh test
- **Duplications** - persentase kode yang terduplikasi
- **Security Hotspots** - potensi masalah keamanan yang perlu ditinjau

### 10. Webhook GitHub (Auto Trigger)

Konfigurasi di Jenkins: **Pipeline (ncc-app-pipeline) -> Configure -> Triggers -> centang "GitHub hook trigger for GITScm polling"**

![alt text](<media/Screenshot 2026-04-27 at 18.09.48.png>)
![alt text](<media/Screenshot 2026-04-27 at 18.10.14.png>)

Konfigurasi di GitHub: **Settings -> Webhooks -> Add webhook:**

- Payload URL: `http://146.190.111.171:8081/github-webhook/`
- Content type: `application/json`
- Events: Just the push event

![alt text](<media/Screenshot 2026-04-27 at 18.12.25.png>)

Setelah webhook aktif, setiap push ke branch `Tugas-2` otomatis trigger pipeline di Jenkins tanpa perlu klik "Build Now" manual. Terlihat di Jenkins: **"Started by GitHub push by rrraynald"**.

### 10. Intentional Failure Test di SonarQube

Uncomment test case berikut di [src/index.test.js](./src/index.test.js) untuk trigger SonarQube Quality Gate failure:

```javascript
// Uncomment fitur berikut untuk trigger code smell, bug, dan vulnerability di SonarQube
app.get("/notes/search", (req, res) => {
  var query = req.query.q; // code smell: pakai var
  var results = [];

  for (var i = 0; i < notes.length; i++) {
    // code smell: var
    if (notes[i].title == query) {
      // bug: pakai ==, seharusnya ===
      results.push(notes[i]);
    }
  }

  if (query == undefined) {
    // bug: ==, seharusnya ===
    return res.status(400).json({ error: "Query required" });
  }

  var password = "admin123"; // vulnerability: hardcoded credential
  console.log(password); // code smell: console.log di production

  eval("var x = 1"); // vulnerability: eval

  res.json(results);
});
```

![alt text](<media/Screenshot 2026-04-27 at 19.47.22.png>)
![alt text](<media/Screenshot 2026-04-27 at 19.48.36.png>)

Hasil menunjukan pipeline yang failed serta detail issues yang ditemukan di SonarQube, termasuk code smell, bug, dan vulnerability. Dengan adanya fitur ini, developer bisa langsung tahu apa yang salah dan memperbaikinya sebelum merge ke branch utama.

### Build Badge

Install plugin **Embeddable Build Status** di Jenkins untuk menampilkan badge status build.

Badge URL: `http://146.190.111.171:8081/buildStatus/icon?job=ncc-app-pipeline`

![Build Status](http://146.190.111.171:8081/buildStatus/icon?job=ncc-app-pipeline)
