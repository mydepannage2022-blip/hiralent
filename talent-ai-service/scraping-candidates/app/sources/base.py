from abc import ABC, abstractmethod
from typing import Iterable, Optional
from app.models.candidate import CandidateNormalized


class BaseSource(ABC):
    name: str

    @abstractmethod
    def fetch(self, query: Optional[str], limit: int) -> Iterable[dict]:
        """
        Return iterable of raw dicts.
        """
        raise NotImplementedError

    @abstractmethod
    def parse(self, raw: dict) -> CandidateNormalized:
        """
        Raw dict -> CandidateNormalized
        """
        raise NotImplementedError

    @abstractmethod
    def descriptor(self) -> dict:
        """
        For /sources endpoint.
        """
        raise NotImplementedError
