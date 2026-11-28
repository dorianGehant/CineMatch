
import { useState } from 'react';

import type { Film } from '../data/films';
import type { PropositionFilm } from '../data/propositionFilm';

import { FilmCard } from './FilmCard';

import '../css/rechercheFilm.css';

// On fait l'enum de cette façon pour pas avoir à changer erasableSyntaxOnly
export const TypeListe = {
    RECHERCHE: "RECHERCHE",
    PROPOSITION: "PROPOSITION",
} as const;

export type TypeListe = typeof TypeListe[keyof typeof TypeListe];

// enum TypeRecherche {
//     RECHERCHE,
//     PROPOSITION
// }

type ListeFilmsProps = {
    mode: TypeListe;
    films: Film[];

    // Props si on est en mode proposition
    soireeId?: number;
    membreId?: number | null;
    filmsProposes?: PropositionFilm[];
    onPropositionChange?: () => void;
};

export function ListeFilms(props: ListeFilmsProps) {
    const [actionError, setActionError] = useState<string | null>(null);
    const [membreIsProposing, setMembreIsProposing] = useState<number | null>(null);

    // Propose ou retire un film de la soirée.
    async function handlePropositionButtonClick(film: Film) {
        if (props.mode !== TypeListe.PROPOSITION) {
            return;
        }

        setMembreIsProposing(film.id);
        setActionError(null);

        try {
            const proposition = props.filmsProposes?.find(
                (p) => p.film.id === film.id
            );

            let response: Response;

            if (proposition) {
                // Le film est déjà proposé : on le retire.
                response = await fetch(
                    `/api/soiree/${props.soireeId}/proposition_film/${proposition.id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            membre_id: props.membreId
                        })
                    }
                );
            } 
            
            else {
                // Le film n'est pas encore proposé : on l'ajoute.
                response = await fetch(
                    `/api/soiree/${props.soireeId}/proposition_film`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            membre_id: props.membreId,
                            film: film
                        })
                    }
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Impossible de modifier la proposition.'
                );
            }

            props.onPropositionChange?.();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Impossible de contacter le serveur.'
            );
        } finally {
            setMembreIsProposing(null);
        }
    }

    return (
        <section className="results-section">

            {actionError && (
                <p className="search-error" role="alert">
                    {actionError}
                </p>
            )}

            <div className="results-grid">
                {props.films.map((film) => {
                    const proposition =
                        props.mode === TypeListe.PROPOSITION
                            ? props.filmsProposes?.find(
                                (p) => p.film.id === film.id
                            )
                            : undefined;

                    const estProposant =
                        proposition !== undefined &&
                        props.membreId === proposition.membre_id;

                    const proposeParAutre =
                        proposition !== undefined && !estProposant;

                    const boutonDesactive =
                        membreIsProposing !== null ||
                        props.membreId == null ||
                        proposeParAutre;

                    return (
                        <div key={film.id}>
                            <FilmCard film={film} />

                            {props.mode === TypeListe.PROPOSITION && (
                                <button
                                    type="button"
                                    className={
                                        boutonDesactive
                                            ? 'proposition-button disabled'
                                            : proposition
                                                ? 'proposition-button remove'
                                                : 'proposition-button add'
                                    }
                                    disabled={boutonDesactive}
                                    onClick={() =>
                                        handlePropositionButtonClick(film)
                                    }
                                >
                                    {membreIsProposing === film.id
                                        ? 'Modification...'
                                        : proposeParAutre
                                            ? 'Film déjà proposé par un autre membre'
                                            : proposition
                                                ? 'Retirer proposition'
                                                : 'Proposer ce film'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
