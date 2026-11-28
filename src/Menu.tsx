import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

import { PageRechercheFilm } from './pages/pageRechercheFilm';
import PageCreationEtListeSoiree from './pages/pageCreationEtListeSoiree';
import { PageSoiree } from './pages/pageSoiree';
import { TMDBCreditsFooter } from './components/TMBDCreditsFooter';

export function Menu() {
    return (
        <>
            <nav className="menu">
                <NavLink to="/rechercheFilm">Recherche film</NavLink>
                <NavLink to="/soirees">Soirées</NavLink>
            </nav>

            <main>
                <Routes>
                    <Route path="/" element={<Navigate to="/rechercheFilm" replace />} />
                    
                    <Route path="/rechercheFilm" element={<PageRechercheFilm />} />

                    <Route path="/soirees" element={<PageCreationEtListeSoiree />} />

                    <Route path="/soiree/:id" element={<PageSoiree />} />
                </Routes>
            </main>

            <TMDBCreditsFooter />
        </>
    );
}