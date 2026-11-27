import type {  Movie } from '../data/films';

export function FilmCard({ film }: {film: Movie }) {
  return (
    <article className="result-card">
      {film.poster ? (
        <img
          src={film.poster}
          alt={`Affiche du film ${film.title}`}
          className="result-poster"
          loading="lazy"
        />
      ) : (
        <div className="result-no-poster">
          <span>Affiche indisponible</span>
        </div>
      )}

      <div className="result-info">
        <h3>{film.title}</h3>
        <p>{film.year ?? 'Année inconnue'}</p>
      </div>
    </article>
  );
}
