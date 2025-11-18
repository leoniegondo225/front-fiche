const Payslip = require("../models/Bulletin");
const { createTransporter, sendPayslipEmail } = require("../utils/mailer");
const path = require("path");
const nodeCron = require("node-cron");

const transporter = createTransporter({
  user: process.env.GMAIL_USER,
  pass: process.env.GMAIL_PASS,
});

exports.envoyerFiches = async (req, res) => {
  const { payslipIds = [], subject = "Fiche de paie", text = "", sendAt } = req.body;
  if (!payslipIds.length)
    return res.status(400).json({ message: "Aucune fiche sélectionnée" });

  const fiches = await Payslip.find({ _id: { $in: payslipIds } });

  // Envoi immédiat
  if (!sendAt) {
    const results = [];
    for (const fiche of fiches) {
      if (!fiche.email) continue;
      try {
        await sendPayslipEmail(transporter, {
          // to: fiche.email,
          to:"leoniegondo@gmail",
          subject,
          text: `${text}\nMot de passe : ${fiche.password}`,
          attachments: [{ filename: path.basename(fiche.filePath), path: fiche.filePath }],
        });
        fiche.status = "sent";
        fiche.sentAt = new Date();
        await fiche.save();
        results.push({ matricule: fiche.matricule, email: fiche.email, status: "sent" });
      } catch (err) {
        fiche.status = "error";
        fiche.error = err.message;
        await fiche.save();
        results.push({ matricule: fiche.matricule, error: err.message });
      }
    }
    return res.json({ results });
  }

  // Programmation (node-cron)
  const date = new Date(sendAt);
  const cronExpr = `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${
    date.getUTCMonth() + 1
  } *`;

  nodeCron.schedule(cronExpr, async () => {
    for (const fiche of fiches) {
      if (!fiche.email) continue;
      await sendPayslipEmail(transporter, {
        // to: fiche.email,
        to:"leoniegondo@gmail",
        subject,
        text,
        attachments: [{ filename: path.basename(fiche.filePath), path: fiche.filePath }],
      });
      fiche.status = "sent";
      fiche.sentAt = new Date();
      await fiche.save();
    }
  });

  for (const f of fiches) {
    f.status = "scheduled";
    f.scheduledAt = date;
    await f.save();
  }

  res.json({ message: "Envoi programmé", date });
};
