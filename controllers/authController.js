const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { ConnectDB } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ;

// Connexion administrateur
exports.login = async (req, res) => {
  try{

  const { email, password } = req.body;
   // Vérification des champs
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

  // Connexion DB
    await ConnectDB(); 
 
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Identifiants invalides" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Identifiants invalides" });

  if (user.role !== "administrateur")
    return res.status(403).json({ message: "Accès refusé" });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

   // Réponse cohérente avec le frontend
    return res.json({
      message: "ok",
      accessToken: token,
    
    });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur import utilisateurs" });
    }
};

// Middleware de protection
exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Token manquant" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "administrateur")
      return res.status(403).json({ message: "Accès refusé" });
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalide" });
  }
};
