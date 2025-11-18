const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const Bulletin = require("../models/Bulletin.js");
const pdfParse = require("pdf-parse");

// === Fonction principale intégrée ===
exports.traiterPDF = async (req, res) => {
  let tempDir;
  let tempFiles = new Set();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    const inputPath = req.file.path;
    const outDir = path.resolve("uploads/out");
    tempDir = path.join(outDir, "temp");
    fs.mkdirSync(tempDir, { recursive: true });

    const data = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(data);
    const totalPages = srcPdf.getPageCount();

    const resultats = [];

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(copiedPage);

      const pdfBytes = await newPdf.save();
      let text = "";

      try {
        const parsed = await pdfParse(pdfBytes);
        text = parsed.text || "";
      } catch (err) {
        console.warn(`pdf-parse échoué page ${i + 1}:`, err.message);
      }

      if (!text.trim()) text = `Page ${i + 1}`;

      // Extraction du matricule
      let matricule = null;
      const lines = text.split(/\r?\n/);
      for (let line of lines) {
        const match = line.trim().match(/^\d+$/); // ligne uniquement chiffres
        if (match) {
          matricule = match[0];
          break;
        }
      }
      if (!matricule) matricule = `page_${i + 1}`;

      const tempName = `${uuidv4()}.pdf`;
      const tempPath = path.join(tempDir, tempName);
      tempFiles.add(tempPath);
      fs.writeFileSync(tempPath, pdfBytes);

      const outPath = path.join(outDir, `${matricule}.pdf`);
      await encryptPdf(tempPath, outPath, matricule);

      try {
        fs.unlinkSync(tempPath);
        tempFiles.delete(tempPath);
      } catch (err) {
        console.warn("Échec suppression temp:", tempPath);
      }

      resultats.push({ matricule, filePath: outPath, password: matricule, text });
    }

    // Génération des liens de téléchargement
    const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;
    const downloadLinks = resultats.map((r) => ({
      matricule: r.matricule,
      url: `${serverUrl}/uploads/out/${r.matricule}.pdf`,
    }));

    // Enregistrement en base
    await Promise.all(
      resultats.map(async (r) => {
        const emailMatch = r.text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
        const email = emailMatch ? emailMatch[0] : null;

        return await Bulletin.create({
          nom: r.nom,
          prénom: r.prénom,
          matricule: r.matricule,
          courriel: email,
          cheminFichier: r.filePath,
          motDePasse: r.password,
          statut: "créé",
          dateCréation: new Date(),
        });
      })
    );

    // --- ENVOI DE LA RÉPONSE **UNE SEULE FOIS** ---
    res.json({
      message: "ok",
      downloadLinks,
    });

  } catch (error) {
    console.error("Erreur traitement PDF:", error);

    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {}
    }

    if (!res.headersSent) {
      res.status(500).json({
        message: "Erreur lors du traitement du PDF",
        error: error.message,
      });
    }
  }
};

// === qpdf ===
function encryptPdf(input, output, password) {
  return new Promise((resolve, reject) => {
    const qpdfPath = process.env.QPDF_PATH || "qpdf";
    const args = ["--encrypt", password, password, "256", "--", input, output];
    const child = spawn(qpdfPath, args);

    let stderr = "";
    child.stderr.on("data", (data) => (stderr += data.toString()));

    child.on("error", reject);
    child.on("exit", (code) => {
      code === 0 ? resolve() : reject(new Error(`qpdf failed: ${stderr.trim()}`));
    });
  });
}
