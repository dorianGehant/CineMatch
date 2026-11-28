import type { PropositionFilm } from "./propositionFilm";
import type { Soiree } from "./soiree";

export type DetailsSoiree = {
    infos_soiree: Soiree,
    propositions_film: PropositionFilm[],
};