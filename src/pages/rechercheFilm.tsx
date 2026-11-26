
import { useState } from 'react';
import type { SyntheticEvent } from "react";
import type { Movie } from '../donnees/films';
import { FilmCard } from '../components/FilmCard';
import '../css/rechercheFilm.css';

export function RechercheFilm() {
    const [filmTitle, setFilmTitle] = useState('');
    const [filmYear, setFilmYear] = useState('');
    const [films, setFilms] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // True si on a fait une recherche, sert pour afficher texte si aucun résultat
    const [hasSearched, setHasSearched] = useState(false); 

    // Recherche les films sur notre serveur.
    async function handleSearch(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        setLoading(true);
        setError(null);
        setFilms([]);
        setHasSearched(true);

        try {
            const params = new URLSearchParams({
                titre: filmTitle
            });

            if (filmYear) {
                params.set('annee', filmYear);
            }

            const response = await fetch(`/api/rechercheFilm?${params.toString()}`);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Une erreur est survenue.');
            }

            setFilms(data);
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : 'Impossible de contacter le serveur.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="search-page">
        <header className="search-header">
            <h1>CinéMatch</h1>
            <p>Ce soir, on regarde quoi ?</p>
        </header>

        <section className="search-section">
            <h2>Chercher un film</h2>

            <form onSubmit={handleSearch} className="search-form">
            <input
                type="text"
                value={filmTitle}
                onChange={(e) => setFilmTitle(e.target.value)}
                placeholder="Ex : Dune, Fast & Furious..."
                aria-label="Titre du film"
            />

            <select
                value={filmYear}
                onChange={(e) => setFilmYear(e.target.value)}
                aria-label="Filtrer par année"
            >
                <option value="">Toutes années comprises</option>

                {Array.from( // Crée tableau d'année de 2026 (index 0) à 1500 (index 2026-length (donc 2026-1499))
                    { length: new Date().getFullYear() - 1499 },
                    (_, i) => new Date().getFullYear() - i
                ).map((year) => ( // Pour chaque valeur du tableau créé on a une option avec la valeur
                    <option key={year} value={year}>
                        {year}
                    </option>
                ))}
            </select>

            <button type="submit" disabled={loading}>
                {loading ? 'Recherche...' : 'Chercher'}
            </button>
            </form>
        </section>

        {/* Chargement */}
        {loading && (
            <p className="search-message">
            Recherche des films en cours...
            </p>
        )}

        {/* Erreur */}
        {error && (
            <p className="search-error" role="alert">
            {error}
            </p>
        )}

        {/* Aucun résultat */}
        {!loading &&
            !error &&
            hasSearched &&
            films.length === 0 && (
            <p className="search-message">
                Aucun film trouvé pour la recherche « {filmTitle} ».
            </p>
            )}

        {/* Résultats */}
        {!loading && films.length > 0 && (
            <section className="results-section">
            <h2>Résultats ({films.length})</h2>

            <div className="results-grid">
                {films.map((film) => (
                <FilmCard film={film}/>
                ))}
            </div>
            </section>
        )}

        </main>
    );
}
