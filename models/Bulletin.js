const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema({
  nom: String, // Nom de l’employé
  prénom: String, // Prénom de l’employé
  matricule: String, // Numéro de matricule de l’employé
  courriel: String, // Adresse e-mail de l’employé
  cheminFichier: String, // Chemin du fichier du bulletin (ex: /uploads/bulletin123.pdf)
  motDePasse: String, // Mot de passe du fichier s’il y en a un
  statut: { 
    type: String, 
    enum: ['créé', 'planifié', 'envoyé', 'erreur'], 
    default: 'créé' 
  }, // État du bulletin
  datePlanifiée: Date, // Date prévue pour l’envoi
  dateEnvoi: Date, // Date réelle d’envoi
  messageErreur: String, // Message d’erreur en cas de problème
  dateCréation: { type: Date, default: Date.now } // Date de création du document
});

module.exports = mongoose.model('Bulletin', bulletinSchema);
