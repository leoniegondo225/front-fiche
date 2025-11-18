const mongoose = require ("mongoose")


 const ConnectDB= async () => {
    try {

        const url= process.env.mongoURI

        const mongoCompass= process.env.mongoCompass

        if(mongoose.connection.readyState===1){
            console.log("Déjà connecté à la base de donnée")
            return "ok"
        }
        
        await mongoose.connect(mongoCompass,{
            dbName: "LabelImpact",
          
        })
        console.log("Connexion à la base de donnée réussie avec succès !")
        return "ok"
    } catch (error) {
        console.log ("Erreur de connexion à", error)
        return "probléme de connexion à la bd"
        
    }
}

module.exports={ConnectDB}