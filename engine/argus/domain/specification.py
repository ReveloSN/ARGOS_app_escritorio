from abc import ABC, abstractmethod


class Specification[Candidate](ABC):
    """Regla de negocio componible con `&`, `|` y `~` (patrón Specification)."""

    @abstractmethod
    def is_satisfied_by(self, candidate: Candidate) -> bool: ...

    def __and__(self, other: "Specification[Candidate]") -> "Specification[Candidate]":
        return AllOf(self, other)

    def __or__(self, other: "Specification[Candidate]") -> "Specification[Candidate]":
        return AnyOf(self, other)

    def __invert__(self) -> "Specification[Candidate]":
        return Not(self)


class AllOf[Candidate](Specification[Candidate]):
    def __init__(self, *specifications: Specification[Candidate]) -> None:
        self._specifications = specifications

    def is_satisfied_by(self, candidate: Candidate) -> bool:
        return all(spec.is_satisfied_by(candidate) for spec in self._specifications)


class AnyOf[Candidate](Specification[Candidate]):
    def __init__(self, *specifications: Specification[Candidate]) -> None:
        self._specifications = specifications

    def is_satisfied_by(self, candidate: Candidate) -> bool:
        return any(spec.is_satisfied_by(candidate) for spec in self._specifications)


class Not[Candidate](Specification[Candidate]):
    def __init__(self, specification: Specification[Candidate]) -> None:
        self._specification = specification

    def is_satisfied_by(self, candidate: Candidate) -> bool:
        return not self._specification.is_satisfied_by(candidate)
