import express from 'express';
import type { Request, Response } from 'express';
import type { Soiree } from '../src/data/soiree.ts'
import db from './base.ts';


////////////// ///////////////////////////////////////
// Partie fonctions pour utilisation dans route API //
//////////////////////////////////////////////////////

// Vérifie si une date est dans un format valide pour une soiree (pas dans le passé)
function validateSoireeDate(date: string): string {

    // Du format aaaa-mm-jj
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return "Format de la date incorrect : doit être aaaa-mm-jj";
    }

    const [year, month, day] = date.split("-").map(Number);

    // Quand on fait Date() si la date est incorrecte par ex 2026-02-30, 
    // alors ça corrige en 2026-03-02
    // on fait month - 1 car constructeur Date() part de index 0 pour mois (alors que nous de 1)
    const correctDate = new Date(Date.UTC(year, month - 1, day)); 

    // Si la date corrigée est pas la même que celle de base cela veut dire que on avait une date incorrecte
    if (correctDate.getUTCFullYear() !== year ||
        correctDate.getUTCMonth() !== month - 1 ||
        correctDate.getUTCDate() !== day)
    {
        return "La date de la soirée n'est pas une date possible";
    }

    // Constructeur date sans paramètres = date actuelle
    const currentDate = new Date();
    // On ignore le temps car on veut seulement comparer date
    currentDate.setHours(0, 0, 0, 0);

    if(new Date(year, month - 1, day) < currentDate){
        return "La date de la soirée ne peut pas être dans le passé";
    }

    // Pas de problème, date est correcte
    return "";
}



////////////////
// Partie API //
////////////////

const app = express();
app.use(express.json());

// GET /api/recherche?titre=...
// Recherche des films sur TMDB.
app.get("/api/rechercheFilm", async (req: Request, res: Response) => {

    // Recupération des paramètres de l'url
    const titre = req.query.titre; 
    const annee = req.query.annee;

    if (typeof titre !== "string" || titre.trim().length === 0) {
        return res.status(400).json({
            error: "Veuillez renseigner un titre de film."
        });
    }

    // Vérification de l'année si elle est renseignée.
    if (
        annee !== undefined &&
        (
            typeof annee !== "string" || // pas une string
            !/^\d{4}$/.test(annee) || // pas 4 chiffres à la suite
            Number(annee) < 1500 || // avant 1500
            Number(annee) > new Date().getFullYear() + 10 // année actuelle + 10 
        )
    ) {
        return res.status(400).json({
            error: "L'année doit être une année valide."
        });
    }

    const token = process.env.TMDB_TOKEN;

    if (!token) {
        console.error("Erreur TMDB : le jeton TMDB_TOKEN est absent.");

        return res.status(502).json({
            error: "Impossible de contacter le service de recherche de films."
        });
    }

    try {

        // Préparation de l'adresse de recherche TMDB.
        const params = new URLSearchParams({
            query: titre.trim(),
            language: "fr-FR",
            page: "1"
        });

        // Si une année est sélectionnée, on demande à TMDB de filtrer.
        if (annee) {
            params.append("primary_release_year", annee);
        }

        const url = `https://api.themoviedb.org/3/search/movie?${params.toString()}`;

        // Appel de l'API TMDB avec le jeton d'accès.
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                accept: "application/json"
            }
        });

        // Si TMDB renvoie une erreur.
        if (!response.ok) {
            const details = await response.text();

            console.error(
                `Erreur TMDB : statut ${response.status} ${response.statusText}`,
                details
            );

            return res.status(502).json({
                error: "Le service TMDB est momentanément indisponible."
            });
        }

        // Récupération des résultats.
        const data = await response.json() as {
            results: {
                id: number;
                title: string;
                release_date: string;
                poster_path: string | null;
            }[];
        };

        // Conserver seulement données qu'on veut
        const films = data.results.map((film) => ({
            id: film.id,
            title: film.title,
            year: film.release_date
                ? Number(film.release_date.substring(0, 4))
                : null, // null si pas de date
            poster: film.poster_path
                ? `https://image.tmdb.org/t/p/w500${film.poster_path}`
                : null // null si pas de poster
        }));

        return res.json(films);

    } catch (error) {

        // Affiche erreur dans le terminal du serveur.
        console.error("Erreur lors de la communication avec TMDB :", error);

        return res.status(502).json({
            error: "Impossible de communiquer avec TMDB."
        });
    }
});

// GET /api/soirees
// Récupérer toutes les soirées avec leurs membres
app.get("/api/soirees", async (_req: Request, res: Response) => {
    try {
        const result = await db.execute(`
            SELECT
                s.id AS soiree_id,
                s.nom AS soiree_nom,
                s.date AS soiree_date,
                p.id AS personne_id,
                p.nom AS personne_nom
            FROM soiree s
            JOIN membre_soiree ms ON s.id = ms.soiree_id
            JOIN personne p ON ms.personne_id = p.id
            ORDER BY s.date ASC
        `);

        const soirees: Soiree[] = [];

        for (const row of result.rows) {
            const soireeId = Number(row.soiree_id);

            // On cherche si la soirée existe déjà dans le tableau
            let soiree = soirees.find(s => s.id === soireeId);

            // Si elle n'existe pas, on la crée
            if (!soiree) {
                soiree = {
                    id: soireeId,
                    nom: String(row.soiree_nom),
                    date: String(row.soiree_date),
                    membres: []
                };

                soirees.push(soiree);
            }

            // On ajoute le membre
            if (row.personne_id !== null) {
                soiree.membres.push({
                    id: Number(row.personne_id),
                    nom: String(row.personne_nom)
                });
            }
        }

        // Renvoie la liste des soirées sous forme de JSON
        return res.status(200).json(soirees);

    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Erreur lors de la récupération des soirées."
        });
    }
});

// POST /api/soirees
// Créer une soirée (et ses membres si ils n'existent pas déjà)
app.post("/api/create_soiree", async (req: Request, res: Response) => {
    const { nom, date, membres } = req.body;

    // Vérification du nom
    if (typeof nom !== "string" || nom.trim() === "") {
        return res.status(400).json({
            message: "Le nom de la soirée est obligatoire."
        });
    }

    // Vérification type de la date
    if (typeof date !== "string") {
        return res.status(400).json({
            message: "La date doit être une chaîne de caractère"
        });
    }

    // Vérification que la date est bien une date correcte
    const dateVerifMessage = validateSoireeDate(date);
    if(dateVerifMessage != ""){
        return res.status(400).json({
            message: dateVerifMessage
        });
    }

    // Vérification du nombre de membres
    if (!Array.isArray(membres) || membres.length < 2 || membres.length > 4) {
        return res.status(400).json({
            message: "Une soirée doit avoir entre 2 et 4 membres."
        });
    }

    // Vérification des prénoms
    if (membres.some(
        (prenom: unknown) =>
            typeof prenom !== "string" || prenom.trim() === ""
    )) {
        return res.status(400).json({
            message: "Tous les prénoms doivent être renseignés."
        });
    }

    // Vérification des doublons (sans tenir compte de la casse)
    const prenomsNormalises = membres.map(
        (prenom: string) => prenom.trim().toLowerCase()
    );

    // dans un Set il n'y a pas les doublons donc si la taille n'est pas la même que la liste
    // cela veut dire qu'on avait un doublon qui est devenu une seule valeur dans le Set
    if (new Set(prenomsNormalises).size !== prenomsNormalises.length) {
        return res.status(400).json({
            message: "Deux membres d'une même soirée ne peuvent pas avoir le même prénom."
        });
    }

    // Création de la soirée et des membres dans une transaction
    let transaction;

    try {
        // Début transaction
        transaction = await db.transaction("write");

        // Création de la soirée
        const soireeResult = await transaction.execute({
            sql: `
                INSERT INTO soiree (nom, date)
                VALUES (?, ?)
            `,
            args: [nom.trim(), date]
        });

        // id de la soiree créée
        const soireeId = Number(soireeResult.lastInsertRowid);

        const membresSoiree = [];

        // Création ou récupération des personnes
        for (const nom of membres as string[]) {
            const nomPersonne = nom.trim();

            // Vérifier si la personne existe déjà
            const personneExistante = await transaction.execute({
                sql: `
                    SELECT id
                    FROM personne
                    WHERE nom = ?
                `,
                args: [nomPersonne]
            });

            let personneId: number;

            // Si personne trouvée on recup son id
            if (personneExistante.rows.length > 0) {
                personneId = Number(personneExistante.rows[0].id);
            } 
            // Sinon on crée la personne et on récupère l'id créé
            else {
                // Créer la personne
                const personneResult = await transaction.execute({
                    sql: `
                        INSERT INTO personne (nom)
                        VALUES (?)
                    `,
                    args: [nomPersonne]
                });

                // Récupérer l'id créé
                personneId = Number(personneResult.lastInsertRowid);
            }

            // Créer le lien entre la personne et la soirée
            await transaction.execute({
                sql: `
                    INSERT INTO membre_soiree (personne_id, soiree_id)
                    VALUES (?, ?)
                `,
                args: [personneId, soireeId]
            });

            membresSoiree.push({
                id: personneId,
                nom: nomPersonne
            });
        }

        // Valider la transaction
        await transaction.commit();

        // Réponse
        return res.status(201).json({
            id: soireeId,
            nom: nom.trim(),
            date,
            membres: membresSoiree
        });

    } 
    catch (error) {
        if (transaction) {
            await transaction.rollback();
        }

        // Afficher erreur dans console serveur
        console.error(error);

        return res.status(500).json({
            message: "Erreur lors de la création de la soirée."
        });
    }
});


export default app;
if (!process.env.VERCEL){
    app.listen(3000, () => console.log('http://localhost:3000'))
};