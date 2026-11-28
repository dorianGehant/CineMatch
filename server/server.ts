import express from 'express';
import type { Request, Response } from 'express';
import type { Soiree } from '../src/data/soiree.ts'
import type { DetailsSoiree } from '../src/data/detailsSoiree.ts'
import type { PropositionFilm } from '../src/data/propositionFilm.ts'
import type { Film } from '../src/data/films.ts';
import db from './base.ts';


//////////////////////////////////////////////////////
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
// Vérifie qu'un identifiant est un entier strictement positif
function isValidId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
}

// Vérifie si une soirée existe
async function soireeExists(soireeId: number): Promise<boolean> {
    const result = await db.execute({
        sql: `
            SELECT id
            FROM soiree
            WHERE id = ?
        `,
        args: [soireeId]
    });

    return result.rows.length > 0;
}


// Vérifie si une personne appartient à une soirée
async function memberIsInSoiree(soireeId: number, membreId: number): Promise<boolean> {
    const result = await db.execute({
        sql: `
            SELECT personne_id
            FROM membre_soiree
            WHERE soiree_id = ? AND personne_id = ?
        `,
        args: [soireeId, membreId]
    });

    return result.rows.length > 0;
}


////////////////
// Partie API //
////////////////

const app = express();
app.use(express.json());

// GET /api/recherche?titre=...
// Recherche des films sur TMDB.
app.get("/api/rechercheFilms", async (req: Request, res: Response) => {

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

// GET /api/soiree/:id
// Récupérer les détails d'une soirée : ses membres, ses propositions et les votes.
app.get("/api/soiree/:id", async (req: Request, res: Response) => {

    const soireeId = Number(req.params.id);

    // Vérification de l'identifiant
    if (!isValidId(soireeId)) {
        return res.status(400).json({
            message: "L'identifiant de la soirée est invalide."
        });
    }

    try {

        // Récupérer les informations de la soirée
        const soireeResult = await db.execute({
            sql: `
                SELECT id, nom, date
                FROM soiree
                WHERE id = ?
            `,
            args: [soireeId]
        });

        // Vérifier que la soirée existe
        if (soireeResult.rows.length === 0) {
            return res.status(404).json({
                message: "Cette soirée n'existe pas."
            });
        }

        const soireeRow = soireeResult.rows[0];

        // Récupérer les membres de la soirée
        const membresResult = await db.execute({
            sql: `
                SELECT p.id, p.nom
                FROM personne p
                JOIN membre_soiree ms ON p.id = ms.personne_id
                WHERE ms.soiree_id = ?
            `,
            args: [soireeId]
        });

        const membres = membresResult.rows.map(row => ({
            id: Number(row.id),
            nom: String(row.nom)
        }));

        // Récupérer les propositions de films et leurs proposants
        const propositionsResult = await db.execute({
            sql: `
                SELECT
                    pf.id AS proposition_id,
                    pf.nb_votes_invite,
                    pf.film_TMDBid,
                    pf.film_title,
                    pf.film_year,
                    pf.film_poster,
                    p.id AS personne_id,
                    p.nom AS personne_nom
                FROM proposition_film pf
                JOIN personne p ON pf.personne_id = p.id
                WHERE pf.soiree_id = ?
            `,
            args: [soireeId]
        });

        // Récupérer tous les votes de la soirée
        const votesResult = await db.execute({
            sql: `
                SELECT
                    v.proposition_id,
                    p.id AS personne_id,
                    p.nom AS personne_nom
                FROM vote_proposition_film v
                JOIN personne p ON v.personne_id = p.id
                JOIN proposition_film pf ON v.proposition_id = pf.id
                WHERE pf.soiree_id = ?
            `,
            args: [soireeId]
        });

        // Construire les propositions
        const propositions: PropositionFilm[] = propositionsResult.rows.map(proposition => {

            // Récupérer les membres ayant voté pour cette proposition
            const idsMembresVotant = votesResult.rows
                .filter(vote =>
                    Number(vote.proposition_id) === Number(proposition.proposition_id)
                )
                .map(vote => Number(vote.personne_id));

            return {
                id: Number(proposition.proposition_id),
                nb_votes_invite: Number(proposition.nb_votes_invite),
                film: {
                    id: Number(proposition.film_TMDBid),
                    title: String(proposition.film_title),
                    year: proposition.film_year === null
                        ? null
                        : Number(proposition.film_year),
                    poster: proposition.film_poster === null
                        ? null
                        : String(proposition.film_poster)
                },
                membre_id: Number(proposition.personne_id),
                ids_membres_votant: idsMembresVotant
            };
        });

        // Construire les détails de la soirée
        const detailsSoiree: DetailsSoiree = {
            infos_soiree: {
                id: Number(soireeRow.id),
                nom: String(soireeRow.nom),
                date: String(soireeRow.date),
                membres: membres
            },
            propositions_film: propositions
        };

        return res.status(200).json(detailsSoiree);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erreur lors de la récupération des détails de la soirée."
        });
    }
});

// POST /api/create_soiree
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




// POST /api/soiree/:id
// Ajouter une proposition de film à une soirée
app.post("/api/soiree/:id/proposition_film", async (req: Request, res: Response) => {

    const soireeId = Number(req.params.id);
    const membreId = Number(req.body?.membre_id);
    const film = req.body?.film as Film | undefined;

    // Vérification des identifiants
    if (!isValidId(soireeId)) {
        return res.status(400).json({
            message: "L'identifiant de la soirée est invalide."
        });
    }

    if (!isValidId(membreId)) {
        return res.status(400).json({
            message: "L'identifiant du membre qui fait la proposition est invalide."
        });
    }

    // Vérification des informations du film
    if (
        !film ||
        !isValidId(film.id) ||
        typeof film.title !== "string" ||
        film.title.trim().length === 0 ||
        (
            film.year !== null &&
            (!Number.isInteger(film.year) || film.year < 1500)
        ) ||
        (
            film.poster !== null &&
            typeof film.poster !== "string"
        )
    ) {
        return res.status(400).json({
            message: "Les informations du film proposé sont invalides."
        });
    }

    try {

        // Vérifier que la soirée existe
        if (!(await soireeExists(soireeId))) {
            return res.status(404).json({
                message: "La soirée avec l'id donné n'existe pas."
            });
        }

        // Vérifier que le membre appartient à la soirée
        if (!(await memberIsInSoiree(soireeId, membreId))) {
            return res.status(403).json({
                message: "Le membre avec l'id donné ne fait pas partie de la soirée."
            });
        }

        // Vérifier que le film n'a pas déjà été proposé
        const propositionExistante = await db.execute({
            sql: `
                SELECT id
                FROM proposition_film
                WHERE soiree_id = ? AND film_TMDBid = ?
            `,
            args: [soireeId, film.id]
        });

        if (propositionExistante.rows.length > 0) {
            return res.status(409).json({
                message: "Ce film a déjà été proposé dans cette soirée."
            });
        }

        // Ajouter la proposition
        const result = await db.execute({
            sql: `
                INSERT INTO proposition_film (
                    soiree_id,
                    personne_id,
                    film_TMDBid,
                    film_title,
                    film_year,
                    film_poster
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            args: [
                soireeId,
                membreId,
                film.id,
                film.title.trim(),
                film.year === null ? null : String(film.year),
                film.poster
            ]
        });

        // Construire la proposition créée
        const proposition: PropositionFilm = {
            id: Number(result.lastInsertRowid),
            nb_votes_invite: 0,
            film: {
                id: film.id,
                title: film.title.trim(),
                year: film.year,
                poster: film.poster
            },
            membre_id: membreId,
            ids_membres_votant: []
        };

        return res.status(201).json(proposition);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erreur lors de l'ajout de la proposition."
        });
    }
});


// DELETE /api/soiree/:id/proposition_film/:propositionId
// Supprimer une proposition (seul le membre qui l'a proposée peut le faire)
app.delete("/api/soiree/:id/proposition_film/:propositionId", async (req: Request, res: Response) => {

    const soireeId = Number(req.params.id);
    const propositionId = Number(req.params.propositionId);
    const membreId = Number(req.body?.membre_id);

        // Vérification des identifiants
    if(!isValidId(soireeId)){
        return res.status(400).json({
            message: "L'identifiant de la soirée est invalide."
        });
    }

    if(!isValidId(membreId)){
        return res.status(400).json({
            message: "L'identifiant du membre donné est invalide."
        });
    }

    if(!isValidId(propositionId)){
        return res.status(400).json({
            message: "L'identifiant de la proposition à supprimer est invalide."
        });
    }

    // On utilise transaction car on va faire plusieurs commande de suite et 
    // on veut s'assurer que elles ne soient faites que si elles fonctionnent toutes
    let transaction;

    try {

        // Vérifier que la soirée existe
        if (!(await soireeExists(soireeId))) {
            return res.status(404).json({
                message: "La soirée avec l'id donné n'existe pas."
            });
        }

        // Vérifier que le membre appartient à la soirée
        if (!(await memberIsInSoiree(soireeId, membreId))) {
            return res.status(403).json({
                message: "Le membre avec l'id donné ne fait pas partie la soirée avec l'id donné."
            });
        }

        // Vérifier que la proposition existe dans cette soirée
        const propositionResult = await db.execute({
            sql: `
                SELECT personne_id
                FROM proposition_film
                WHERE id = ? AND soiree_id = ?
            `,
            args: [propositionId, soireeId]
        });

        if (propositionResult.rows.length === 0) {
            return res.status(404).json({
                message: "la proposition avec l'id donné n'existe pas dans la soirée avec l'id donné."
            });
        }

        // Vérifier que le membre est bien celui qui a proposé le film
        if (Number(propositionResult.rows[0].personne_id) !== membreId) {
            return res.status(403).json({
                message: "Seul le membre ayant créé la proposition peut la supprimer."
            });
        }


        transaction = await db.transaction("write");

        // Supprimer votes
        await transaction.execute({
            sql: `
                DELETE FROM vote_proposition_film
                WHERE proposition_id = ?
            `,
            args: [propositionId]
        });

        // Supprimer proposition
        await transaction.execute({
            sql: `
                DELETE FROM proposition_film
                WHERE id = ? AND soiree_id = ?
            `,
            args: [propositionId, soireeId]
        });

        // Commit la transaction quand les deux requêtes sont bien faites correctement
        await transaction.commit();

        return res.status(200).json({
            message: "La proposition a bien été supprimée."
        });

    } catch (error) {

        if (transaction) {
            await transaction.rollback();
        }

        console.error(error);

        return res.status(500).json({
            message: "Erreur lors de la suppression de la proposition."
        });
    }
});


export default app;
if (!process.env.VERCEL){
    app.listen(3000, () => console.log('http://localhost:3000'))
};