from html.parser import HTMLParser

LINE_BREAK_TAGS = frozenset({"br", "p", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"})


class HtmlTextExtractor(HTMLParser):
    """Obtiene el texto visible de un cuerpo de correo en HTML, con saltos en los bloques."""

    def __init__(self) -> None:
        super().__init__()
        self._pieces: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in LINE_BREAK_TAGS:
            self._pieces.append("\n")

    def handle_data(self, data: str) -> None:
        self._pieces.append(data)

    @property
    def text(self) -> str:
        return "".join(self._pieces)


def html_to_text(html: str) -> str:
    extractor = HtmlTextExtractor()
    extractor.feed(html)
    extractor.close()
    return extractor.text
