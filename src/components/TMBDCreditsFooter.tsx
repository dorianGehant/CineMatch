
export function TMDBCreditsFooter() {
    return(
        <footer className="tmdb-footer">
            <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer"
            >
                <img
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg"
                alt="The Movie Database (TMDB)"
                />
            </a>

            <p>
                This product uses the TMDB API but is not endorsed
                or certified by TMDB.
            </p>
        </footer>
    )
}