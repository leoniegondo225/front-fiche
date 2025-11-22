const express = require("express");
const multer = require("multer");
const { traiterPDF } = require("../controllers/pdfController.js");
const { login, authMiddleware } = require("../controllers/authController.js");
const { envoyerFiches } = require("../controllers/mailController.js");

const router = express.Router();

// Route de test
router.get("/", (req, res) => {
    res.send("Route PDF OK");
});

// Configuration de Multer pour stocker les fichiers dans le dossier "uploads"
const upload = multer({ dest: "uploads/" });

router.post("/login", login);
// Route pour l'upload de fichiers
router.post("/upload", upload.single("file"), traiterPDF);
router.post("/sendOne", envoyerFiches)

// Export du router pour pouvoir l'utiliser dans app.js
module.exports = router;
