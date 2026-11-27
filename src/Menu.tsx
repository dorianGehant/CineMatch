import { useEffect, useState } from 'react';
import { RechercheFilm } from './pages/rechercheFilm';
import PageCreationEtListeSoiree from './pages/creationEtListeSoiree';

const pages = [
  { id: 'rechercheFilm', label: 'Recherche film', Page: RechercheFilm },
  { id: 'soirees', label: 'Soirees', Page: PageCreationEtListeSoiree },
];

export function Menu() {
  const [hash, setHash] = useState(window.location.hash.slice(1));

  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const current = pages.find((p) => p.id === hash) ?? pages[0];


  return (
    <>
      <nav className="menu">
        {pages.map((p) => (
          <a key={p.id} href={`#${p.id}`} aria-current={p === current ? 'page' : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      <current.Page />
    </>
  );
}
