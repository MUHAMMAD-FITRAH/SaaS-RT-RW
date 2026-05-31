/**
 * Deploy script — pushes project to VPS via SSH
 * Run: node deploy-vps.js
 */
const { Client } = require("ssh2");

const VPS = {
  host:     "103.23.198.75",
  port:     22,
  username: "idn_project",
  password: "IDNproject12!",
};

const REPO   = "https://github.com/MUHAMMAD-FITRAH/SaaS-RT-RW.git";
const APPDIR = "/home/idn_project/saas-rt-rw";

// Commands to run on VPS in sequence
const STEPS = [
  // 1. Ensure Node.js 20 + PM2 + Git are installed
  `command -v node || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)`,
  `command -v git  || apt-get install -y git`,
  `command -v pm2  || npm install -g pm2`,

  // 2. Clone or pull latest code
  `if [ -d "${APPDIR}/.git" ]; then
     cd ${APPDIR} && git fetch origin && git reset --hard origin/master
   else
     git clone ${REPO} ${APPDIR}
   fi`,

  // 3. Install dependencies
  `cd ${APPDIR} && npm install --legacy-peer-deps`,

  // 4. Create .env if not exists (user must fill secrets)
  `[ -f ${APPDIR}/.env ] || cp ${APPDIR}/.env.example ${APPDIR}/.env && echo "⚠️  PLEASE EDIT ${APPDIR}/.env with real values!"`,

  // 5. Generate Prisma client
  `cd ${APPDIR} && npx prisma generate`,

  // 6. Build Next.js
  `cd ${APPDIR} && npm run build`,

  // 6b. Copy .env into standalone dir so NEXTAUTH_URL & secrets are available at runtime
  `cp ${APPDIR}/.env ${APPDIR}/.next/standalone/.env`,

  // 7. Start / restart with PM2
  `cd ${APPDIR} && pm2 describe saas-rt-rw > /dev/null 2>&1 \
     && pm2 restart saas-rt-rw \
     || pm2 start npm --name "saas-rt-rw" -- start`,

  // 8. Save PM2 process list & enable autostart
  `pm2 save && pm2 startup systemd -u idn_project --hp /home/idn_project 2>/dev/null | tail -1 | bash || true`,

  // 9. Status
  `pm2 list`,
];

const conn = new Client();

conn.on("ready", () => {
  console.log("✅ SSH Connected to", VPS.host);
  runSteps(conn, STEPS, 0);
});

conn.on("error", (err) => {
  console.error("❌ SSH Error:", err.message);
});

conn.connect(VPS);

function runSteps(conn, steps, idx) {
  if (idx >= steps.length) {
    console.log("\n🎉 Deploy selesai!");
    console.log(`   App berjalan di: http://${VPS.host}:3000`);
    conn.end();
    return;
  }

  const step = steps[idx];
  const label = step.split("\n")[0].substring(0, 70);
  console.log(`\n[${idx + 1}/${steps.length}] ${label}...`);

  conn.exec(`bash -c '${step.replace(/'/g, "'\\''")}'`, { pty: false }, (err, stream) => {
    if (err) { console.error("  ❌", err.message); runSteps(conn, steps, idx + 1); return; }

    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`  ⚠️  Exit code ${code} — continuing...`);
      }
      runSteps(conn, steps, idx + 1);
    });
  });
}
