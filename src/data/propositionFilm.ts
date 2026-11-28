import type { Film } from "./films";

export type PropositionFilm = {
    id: number;
    nb_votes_invite: number;
    film: Film;
    membre_id: number;
    ids_membres_votant: number[];
};