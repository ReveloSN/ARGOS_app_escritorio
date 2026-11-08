from html.parser import HTMLParser

LINE_BREAK_TAGS = frozenset({"br", "p", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"})
# Su contenido no se ve al leer el correo: un «4587» escondido ahí no debe generar alertas.
HIDDEN_TAGS = frozenset({"script", "style", "head", "title", "noscript", "template"})


class HtmlTextExtractor(HTMLParser):
    """Obtiene el texto visible de un cuerpo de correo en HTML, con saltos en los bloques."""

    def __init__(self) -> None:
        super().__init__()
        self._pieces: list[str] = []
        self._hidden_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in HIDDEN_TAGS:
            self._hidden_depth += 1
        elif tag in LINE_BREAK_TAGS:
            self._pieces.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in HIDDEN_TAGS and self._hidden_depth > 0:
            self._hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._hidden_depth == 0:
            self._pieces.append(data)

    @property
    def text(self) -> str:
        return "".join(self._pieces)


def html_to_text(html: str) -> str:
    extractor = HtmlTextExtractor()
    extractor.feed(html)
    extractor.close()
    return extractor.text
