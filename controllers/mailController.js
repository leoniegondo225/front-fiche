const { createTransporter, sendBulletinEmail } = require("../utils/mailer");
const multer = require("multer");
const path = require("path");

// Création du transporteur SMTP
const transporter = createTransporter({
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
});

// Middleware Multer
const upload = multer({ storage: multer.memoryStorage() });

exports.envoyerFiches = [
  upload.array("files"),
  async (req, res) => {
    try {
      console.log("📩 [envoyerFiches] Requête reçue !");

      const { files: metaFiles = [], subject = "Fiche de paie", text = "", mode = "individual" } = req.body;
      const uploadedFiles = req.files;

      console.log("👉 Métadonnées reçues :", metaFiles);
      console.log("👉 Nombre de fichiers uploadés :", uploadedFiles?.length || 0);

      if (!metaFiles || !uploadedFiles || uploadedFiles.length === 0) {
        console.log("❌ Aucun fichier ou métadonnées fournies");
        return res.status(400).json({ message: "Aucun fichier ou métadonnées fournies" });
      }

      const parsedMeta = JSON.parse(metaFiles);
      const results = [];

      // ----- MODE BCC ------
      if (mode === "bcc") {
        console.log("📮 Mode BCC activé");

        const recipients = parsedMeta.map(f => f.email).filter(Boolean);
        console.log("📧 Destinataires BCC :", recipients);

        const attachments = parsedMeta
          .map(f => {
            const file = uploadedFiles.find(u => u.originalname.includes(f.matricule));
            return file ? { filename: `${f.matricule}.pdf`, content: file.buffer } : null;
          })
          .filter(Boolean);

        console.log("📎 Nombre de pièces jointes :", attachments.length);

        try {
          console.log("🚀 Envoi BCC en cours...");
          await sendBulletinEmail(transporter, {
            to: transporter.options.auth.user,
            bcc: process.env.TEST_EMAIL ? process.env.TEST_EMAIL : recipients.join(", "),
            subject,
            text,
            attachments
          });

          console.log("✅ Email BCC envoyé avec succès !");
          parsedMeta.forEach(f => results.push({ matricule: f.matricule, email: f.email, status: "envoyé" }));

          return res.json({ results });

        } catch (err) {
          console.log("❌ Erreur SMTP BCC :", err.message);
          parsedMeta.forEach(f => results.push({ matricule: f.matricule, email: f.email, error: err.message }));
          return res.status(500).json({ results, message: err.message });
        }
      }

      // ----- MODE INDIVIDUEL ------
      console.log("📮 Mode individuel activé");

      for (const f of parsedMeta) {
        console.log("\n---------------------------------------");
        console.log(`📁 Traitement du matricule : ${f.matricule}`);

        if (!f.email) {
          console.log("⚠️ Aucun email pour ce matricule → ignoré");
          results.push({ matricule: f.matricule, status: "skipped", reason: "pas d'email" });
          continue;
        }

        const file = uploadedFiles.find(u => u.originalname.includes(f.matricule));

        if (!file) {
          console.log("❌ Aucun fichier correspondant trouvé !");
          results.push({ matricule: f.matricule, email: f.email, status: "skipped", reason: "fichier introuvable" });
          continue;
        }

        try {
          const recipientEmail = process.env.TEST_EMAIL || f.email;

          console.log("📧 Envoi email →", recipientEmail);
          console.log("📎 Fichier joint :", `${f.matricule}.pdf`);
          console.log("🧪 Mode test :", process.env.TEST_EMAIL ? "OUI (TEST_EMAIL actif)" : "NON");

          await sendBulletinEmail(transporter, {
            to: recipientEmail,
            subject,
            text,
            attachments: [{ filename: `${f.matricule}.pdf`, content: file.buffer }]
          });

          console.log("✅ Email individuel envoyé avec succès !");
          results.push({ matricule: f.matricule, email: recipientEmail, status: "envoyé" });

        } catch (err) {
          console.log("❌ Erreur SMTP :", err.message);
          results.push({ matricule: f.matricule, email: f.email, error: err.message });
        }
      }

      console.log("\n🎉 FIN TRAITEMENT — Emails envoyés !");
      return res.json({ results });

    } catch (err) {
      console.log("🔥 ERREUR FATALE :", err.message);
      return res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
  }
];

// Envoi d’un seul fichier
exports.sendOne = [
  upload.single("file"),
  async (req, res) => {
    try {
      console.log("📩 [sendOne] Envoi d'un fichier unique");

      const { matricule, email, subject = "Fiche de paie", text = "" } = req.body;

      if (!req.file) {
        console.log("❌ Aucun fichier reçu !");
        return res.status(400).json({ message: "Aucun fichier PDF reçu" });
      }

      console.log("📎 Fichier reçu :", req.file.originalname);
      console.log("👤 Matricule :", matricule);
      console.log("📧 Email original :", email);

      const finalRecipient = process.env.TEST_EMAIL || email;

      console.log("📨 Destinataire final :", finalRecipient);
      console.log("🧪 Mode test :", process.env.TEST_EMAIL ? "OUI" : "NON");

      await sendBulletinEmail(transporter, {
        to: finalRecipient,
        subject,
        text,
        attachments: [
          {
            filename: `${matricule}.pdf`,
            content: req.file.buffer,
          },
        ],
      });

      console.log("✅ Email envoyé avec succès à :", finalRecipient);

      return res.json({
        matricule,
        email: finalRecipient,
        status: "envoyé",
        testMode: !!process.env.TEST_EMAIL
      });

    } catch (err) {
      console.log("🔥 Erreur sendOne :", err.message);
      return res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
  },
];


/*
const { createTransporter, sendBulletinEmail } = require("../utils/mailer");
const multer = require("multer");
const path = require("path");

// Création du transporteur SMTP
const transporter = createTransporter({
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
});

// Middleware Multer
const upload = multer({ storage: multer.memoryStorage() });

exports.envoyerFiches = [
  upload.array("files"),
  async (req, res) => {
    try {
      console.log("📩 [envoyerFiches] Requête reçue !");

      const { files: metaFiles = [], subject = "Fiche de paie", text = "", mode = "individual" } = req.body;
      const uploadedFiles = req.files;

      if (!metaFiles || !uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ message: "Aucun fichier ou métadonnées fournies" });
      }

      const parsedMeta = JSON.parse(metaFiles);
      const results = [];

      // ----- MODE BCC ------
      if (mode === "bcc") {
        const recipients = parsedMeta.map(f => f.email).filter(Boolean);

        const attachments = parsedMeta
          .map(f => {
            const file = uploadedFiles.find(u => u.originalname.includes(f.matricule));
            return file ? { filename: `${f.matricule}.pdf`, content: file.buffer } : null;
          })
          .filter(Boolean);

        try {
          await sendBulletinEmail(transporter, {
            to: transporter.options.auth.user,
            bcc: process.env.TEST_EMAIL ? process.env.TEST_EMAIL : recipients.join(", "),
            subject,
            text,
            attachments
          });

          parsedMeta.forEach(f => results.push({ matricule: f.matricule, email: f.email, status: "envoyé" }));
          return res.json({ results });

        } catch (err) {
          parsedMeta.forEach(f => results.push({ matricule: f.matricule, email: f.email, error: err.message }));
          return res.status(500).json({ results, message: err.message });
        }
      }

      // ----- MODE INDIVIDUEL ------
      for (const f of parsedMeta) {
        if (!f.email) {
          results.push({ matricule: f.matricule, status: "skipped", reason: "pas d'email" });
          continue;
        }

        const file = uploadedFiles.find(u => u.originalname.includes(f.matricule));
        if (!file) {
          results.push({ matricule: f.matricule, email: f.email, status: "skipped", reason: "fichier introuvable" });
          continue;
        }

        try {
          const recipientEmail = process.env.TEST_EMAIL || f.email;
          await sendBulletinEmail(transporter, {
            to: recipientEmail,
            subject,
            text,
            attachments: [{ filename: `${f.matricule}.pdf`, content: file.buffer }]
          });
          results.push({ matricule: f.matricule, email: recipientEmail, status: "envoyé" });
        } catch (err) {
          results.push({ matricule: f.matricule, email: f.email, error: err.message });
        }
      }

      return res.json({ results });

    } catch (err) {
      return res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
  }
];

// Envoi d’un seul fichier
exports.sendOne = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { matricule, email, subject = "Fiche de paie", text = "" } = req.body;

      if (!req.file) return res.status(400).json({ message: "Aucun fichier PDF reçu" });

      const finalRecipient = process.env.TEST_EMAIL || email;
      await sendBulletinEmail(transporter, {
        to: finalRecipient,
        subject,
        text,
        attachments: [{ filename: `${matricule}.pdf`, content: req.file.buffer }]
      });

      return res.json({
        matricule,
        email: finalRecipient,
        status: "envoyé",
        testMode: !!process.env.TEST_EMAIL
      });

    } catch (err) {
      return res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
  },
];
*/

/*
💡 Pour tester avec ton propre email ou mode test :
- Tu peux activer process.env.TEST_EMAIL = "ton_email_test@example.com"
- Le code n’enverra alors pas aux vrais destinataires
- Pour tester réellement avec les vrais emails, il suffit de dé-commenter le bloc ci-dessus
*/
