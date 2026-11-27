
import { useState, useEffect, useCallback, type SyntheticEvent } from "react";
import type { Soiree } from "../data/soiree";
import "../css/creationEtListeSoiree.css";

// Récupère la date du jour au format aaaa-mm-jj
function getCurrentDate(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Formate une date pour l'affichage
function formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function PageCreationEtListeSoiree() {
    // Liste des soirées
    const [soirees, setSoirees] = useState<Soiree[]>([]);
    const [loading, setLoading] = useState(true);

    // Champs du formulaire
    const [nom, setNom] = useState("");
    const [date, setDate] = useState("");
    const [membres, setMembres] = useState(["", ""]);

    // Messages
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Récupération des soirées depuis l'API
    async function fetchSoirees(){
        try {
            const response = await fetch("/api/soirees");

            if (!response.ok) {
                throw new Error("Impossible de récupérer les soirées.");
            }

            const data: Soiree[] = await response.json();

            setSoirees(data);

        } catch (err) {
            console.error(err);
            setError("Impossible de récupérer les soirées.");
        } finally {
            setLoading(false);
        }
    }

    // Chargement des soirées initial
    useEffect(() => {
        fetchSoirees();
    }, []);

    // Modifier le prénom d'un membre
    function handleMemberChange(index: number, value: string) {
        setMembres(previous => {
            // On fait une copie du tableau qu'on modifie
            // Car sinon si on modifiait directement le tableau React pourrait ne pas considérer
            // Que le state n'a pas changé et donc ne pas re-render
            const updated = [...previous];
            updated[index] = value;
            return updated;
        });
    }

    // Ajouter un membre
    function addMember() {
        if (membres.length < 4) {
            setMembres(previous => [...previous, ""]);
        }
    }

    // Supprimer un membre
    function removeMember(index: number) {
        if (membres.length > 2) {
            setMembres(previous =>
                previous.filter((_, i) => i !== index) // liste des membres qui n'ont pas l'index donné
            );
        }
    }

    // Création d'une soirée
    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/create_soiree", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nom,
                    date,
                    membres
                })
            });

            const data = await response.json();

            // Affichage des erreurs renvoyées par le serveur
            if (!response.ok) {
                setError(data.message || data.error || "Une erreur est survenue.");
                return;
            }

            // Réinitialisation du formulaire
            setNom("");
            setDate("");
            setMembres(["", ""]);

            setSuccess(`La soirée "${data.nom}" a bien été créée !`);

            // Actualisation de la liste
            await fetchSoirees();

        } catch (err) {
            console.error(err);
            setError("Impossible de contacter le serveur.");
        }
    }

    return (
        <main className="container">

            <section className="form-section">
                <h2>Créer une soirée</h2>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="nom">Nom de la soirée</label>

                        <input
                            id="nom"
                            type="text"
                            placeholder="Mercredîné"
                            value={nom}
                            onChange={e => setNom(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="date">Date</label>

                        <input
                            id="date"
                            type="date"
                            min={getCurrentDate()}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Membres : 2 à 4 prénoms</label>

                        {membres.map((membre, index) => (
                            <div className="member-input" key={index}>

                                <input
                                    type="text"
                                    placeholder={`Prénom du membre ${index + 1}`}
                                    value={membre}
                                    onChange={e =>
                                        handleMemberChange(index, e.target.value)
                                    }
                                    required
                                />

                                {membres.length > 2 && (
                                    <button
                                        type="button"
                                        className="remove-button"
                                        onClick={() => removeMember(index)}
                                    >
                                        ✕
                                    </button>
                                )}

                            </div>
                        ))}

                        {membres.length < 4 && (
                            <button
                                type="button"
                                className="add-button"
                                onClick={addMember}
                            >
                                + Ajouter un membre
                            </button>
                        )}
                    </div>

                    {/* Messages d'erreur et de succès */}

                    {error && (
                        <p className="error-message">{error}</p>
                    )}

                    {success && (
                        <p className="success-message">{success}</p>
                    )}

                    <button type="submit" className="submit-button">
                        Créer la soirée
                    </button>

                </form>
            </section>


            <section className="soirees-section">
                <h2>Les soirées</h2>

                {loading ? (
                    <p>Chargement des soirées...</p>
                ) : soirees.length === 0 ? (
                    <p className="empty-message">
                        Aucune soirée prévue pour le moment.
                    </p>
                ) : (
                    <div className="soirees-list">

                        {soirees.map(soiree => (
                            <article className="soiree-card" key={soiree.id}>

                                <div className="soiree-header">
                                    <h3>{soiree.nom} - {formatDate(soiree.date)}</h3>
                                </div>

                                <p className="liste-membres">
                                    {soiree.membres.map(membre => membre.nom).join(", ")}
                                </p>

                            </article>
                        ))}

                    </div>
                )}
            </section>

        </main>
    );
}

export default PageCreationEtListeSoiree;
