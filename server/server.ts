import express from 'express';
import type { Request, Response } from 'express';
import db from './base.ts';

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

export default app;
if (!process.env.VERCEL){
    app.listen(3000, () => console.log('http://localhost:3000'))
};