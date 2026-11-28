
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';

import type { Film } from '../data/films';
import type { DetailsSoiree } from '../data/detailsSoiree';

import { FilmCard } from '../components/FilmCard';
import { ListeFilms, TypeListe } from '../components/RechercheFilm';

import '../css/pageSoiree.css';

export function PageSoiree() {
    const { id } = useParams();

    const soireeId = Number(id);

    const [details, setDetails] = useState<DetailsSoiree | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    // Membre actuellement sélectionné
    const [membreId, setMembreId] = useState<number | null>(null);

    // Films recherchés
    const [filmTitle, setFilmTitle] = useState('');
    const [filmYear, setFilmYear] = useState('');

    const [films, setFilms] = useState<Film[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Charge les détails de la soirée
    async function chargeSoireeDetails() {
        setLoadingDetails(true);
        setErrorDetails(null);

        try {
            const response = await fetch(`/api/soiree/${soireeId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Impossible de récupérer la soirée.'
                );
            }

            setDetails(data);
        } catch (err) {
            setErrorDetails(
                err instanceof Error
                    ? err.message
                    : 'Impossible de contacter le serveur.'
            );
        } finally {
            setLoadingDetails(false);
        }
    }

    useEffect(() => {
        if (!Number.isInteger(soireeId) || soireeId <= 0) {
            setErrorDetails('Identifiant de soirée invalide.');
            setLoadingDetails(false);
            return;
        }

        chargeSoireeDetails();
    }, [soireeId]);

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

            const response = await fetch(
                `/api/rechercheFilms?${params.toString()}`
            );

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

    // Classe les propositions selon leur nombre de votes.
    const rankedPropositions = [...(details?.propositions_film ?? [])]
        .sort((a, b) => {
            const votesA = a.nb_votes_invite + a.ids_membres_votant.length;
            const votesB = b.nb_votes_invite + b.ids_membres_votant.length;

            return votesB - votesA;
        });

    if (loadingDetails) {
        return (
            <main className="search-page">
                <p className="search-message">
                    Chargement de la soirée...
                </p>
            </main>
        );
    }

    if (errorDetails || !details) {
        return (
            <main className="search-page">
                <p className="search-error" role="alert">
                    {errorDetails || 'Soirée introuvable.'}
                </p>
            </main>
        );
    }

    return (
        <main className="search-page">

            {/* Informations de la soirée */}
            <header className="search-header">
                <h1>{details.infos_soiree.nom}</h1>
                <p>
                    Date : {details.infos_soiree.date}
                </p>
            </header>

            {/* Sélection du membre */}
            <section className="search-section">
                <h2>Qui es-tu ?</h2>

                <div className="members-list">
                    {details.infos_soiree.membres.map((membre) => (
                        <button
                            key={membre.id}
                            type="button"
                            className={
                                membreId === membre.id
                                    ? 'member-button selected'
                                    : 'member-button'
                            }
                            onClick={() => setMembreId(membre.id)}
                        >
                            {membre.nom}
                        </button>
                    ))}
                </div>

                {membreId !== null && (
                    <p>
                        Membre sélectionné : {
                            details.infos_soiree.membres.find(
                                (membre) => membre.id === membreId
                            )?.nom
                        }
                    </p>
                )}
            </section>

            {/* Classement des films proposés */}
            <section className="search-section">
                <h2>Classement des films proposés</h2>

                {rankedPropositions.length === 0 ? (
                    <p className="search-message">
                        Aucun film n'a encore été proposé.
                    </p>
                ) : (
                    <ol className="ranking-list">
                        {rankedPropositions.map((proposition, index) => (
                            <li key={proposition.id}>
                                <strong>{index + 1}.</strong>

                                <span>{proposition.film.title}</span>

                                <span>
                                    {proposition.nb_votes_invite +
                                        proposition.ids_membres_votant.length}
                                    {' '}votes
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {/* Liste des films proposés */}
            <section className="search-section">
                <h2>Films proposés</h2>

                {rankedPropositions.length === 0 ? (
                    <p className="search-message">
                        Les propositions apparaîtront ici.
                    </p>
                ) : (
                    <div className="results-grid">
                        {rankedPropositions.map((proposition) => (
                            <div key={proposition.id}>
                                <FilmCard film={proposition.film} />

                                <p>
                                    Proposé par : {
                                        details.infos_soiree.membres.find(
                                            (membre) =>
                                                membre.id === proposition.membre_id
                                        )?.nom ?? 'Inconnu'
                                    }
                                </p>

                                <p>
                                    Votes : {
                                        proposition.nb_votes_invite +
                                        proposition.ids_membres_votant.length
                                    }
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Recherche et proposition de films */}
            <section className="search-section">
                <h2>Rechercher un film à proposer</h2>

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

                {!loading && films.length > 0 && (
                    <ListeFilms
                        mode={TypeListe.PROPOSITION}
                        films={films}
                        soireeId={soireeId}
                        membreId={membreId}
                        filmsProposes={details.propositions_film}
                        onPropositionChange={chargeSoireeDetails}
                    />
                )}
            </section>

        </main>
    );
}
