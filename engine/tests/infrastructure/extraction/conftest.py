from argus.application.ports.entity_extractor import EntityExtractor


def normalized_values(extractor: EntityExtractor, text: str) -> list[str]:
    return [match.normalized_value for match in extractor.extract(text)]


def raw_values(extractor: EntityExtractor, text: str) -> list[str]:
    return [match.raw_value for match in extractor.extract(text)]
