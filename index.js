const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const router = require("./Routes/route.js");
const { ConnectDB } = require("./config/db.js");
const User = require("./models/user.js"); // modèle de ton administrateur
const bcrypt = require("bcrypt");
const path = require('path');




const app = express();

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
// Servir le dossier "uploads" pour que les fichiers générés soient accessibles via URL
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const domaineAutorise = ["http://localhost:3600","http://localhost:3000"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || domaineAutorise.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Domaine non autorisé par le CORS"));
    }
  },
};

app.use(cors());
// ou plus restreint, pour /uploads :
app.use('/uploads', (req,res,next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
  next()
}, express.static(path.join(__dirname, 'uploads')))

// 🔹 Fonction pour créer l’administrateur s’il n’existe pas
async function ensureAdmin() {
     try {
  const email = process.env.ADMIN_EMAIL ;
  const password = process.env.ADMIN_PASS ;
  
    if (!email || !password) {
      console.warn("⚠️ ADMIN_EMAIL ou ADMIN_PASS manquant dans le fichier .env");
      return;
    }

  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      passwordHash,
      role: "administrateur",
    });
    console.log("✅ Administrateur créé avec succès " );
  } else {
    console.log("👤 Admin déjà existant ");
  }
  }  catch (error) {
    console.error("❌ Erreur lors de la vérification de l’administrateur :", error.message);
  }
}


ConnectDB();
ensureAdmin(); 


app.use(express.json());
app.use("/api", router);

app.use("/", async (req, res) => {
  try {
    const re = await ConnectDB();
    if (re === "ok") {
      res.send("success");
    } else {
      res.status(500).json({ error: re, message: "Impossible de se connecter à la BD" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3600, () => console.log("Serveur lancé au port 2000"));

module.exports = app; // CommonJS export
