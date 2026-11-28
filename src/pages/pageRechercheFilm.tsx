import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import type { Film } from '../data/films';

import { ListeFilms, TypeListe } from '../components/RechercheFilm';

import '../css/rechercheFilm.css';

export function PageRechercheFilm() {
    const [filmTitle, setFilmTitle] = useState('');
    const [filmYear, setFilmYear] = useState('');

    const [films, setFilms] = useState<Film[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [hasSearched, setHasSearched] = useState(false);

    // Recherche les films
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

            const response = await fetch(`/api/rechercheFilms?${params.toString()}`);

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
                        <option value="">Toutes années</option>

                        {Array.from(
                            { length: new Date().getFullYear() - 1499 },
                            (_, i) => new Date().getFullYear() - i
                        ).map((year) => (
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

            {loading && (
                <p className="search-message">
                    Recherche des films en cours...
                </p>
            )}

            {error && (
                <p className="search-error" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && hasSearched && films.length === 0 && (
                <p className="search-message">
                    Aucun film trouvé pour la recherche « {filmTitle} ».
                </p>
            )}

            {!loading && !error && films.length > 0 && (
                <div>
                    <h3>Résultats ({films.length})</h3>
                    <ListeFilms
                        mode={TypeListe.RECHERCHE}
                        films={films}
                    />
                </div>
            )}
        </main>
    );
}
