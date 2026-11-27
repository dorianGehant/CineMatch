import type { Personne } from "./personne";

export type Soiree = {
    id: number;
    nom: string;
    date: string;
    membres: Personne[];
};