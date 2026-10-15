"""Construcción de las dependencias del motor: el único lugar que conoce los adaptadores."""

from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.domain.comparison.comparators_by_type import comparators_for
from argus.domain.document import DocumentFormat
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.domain.sensitivity import DEFAULT_SENSITIVITY, Sensitivity
from argus.infrastructure.extraction.contract_id_extractor import ContractIdExtractor
from argus.infrastructure.extraction.date_extractor import DateExtractor
from argus.infrastructure.extraction.money_extractor import MoneyExtractor
from argus.infrastructure.extraction.organization_name_extractor import (
    OrganizationNameExtractor,
)
from argus.infrastructure.extraction.period_extractor import PeriodExtractor
from argus.infrastructure.extraction.person_name_extractor import PersonNameExtractor
from argus.infrastructure.extraction.tax_id_extractor import TaxIdExtractor
from argus.infrastructure.readers.docx_reader import DocxDocumentReader
from argus.infrastructure.readers.eml_reader import EmlDocumentReader
from argus.infrastructure.readers.pdf_reader import PdfDocumentReader
from argus.infrastructure.readers.text_reader import PlainTextReader
from argus.infrastructure.readers.xlsx_reader import XlsxDocumentReader


def build_document_reader_factory() -> DocumentReaderFactory:
    attachment_readers = DocumentReaderFactory(
        {
            DocumentFormat.PDF: PdfDocumentReader(),
            DocumentFormat.DOCX: DocxDocumentReader(),
            DocumentFormat.XLSX: XlsxDocumentReader(),
            DocumentFormat.TEXT: PlainTextReader(),
        }
    )
    return attachment_readers.with_reader(DocumentFormat.EML, EmlDocumentReader(attachment_readers))


def build_inconsistency_detector(
    sensitivity: Sensitivity = DEFAULT_SENSITIVITY,
) -> DetectInconsistencies:
    policy = sensitivity.policy
    return DetectInconsistencies(
        comparators_for(policy),
        RiskClassifier(DEFAULT_RISK_RULES),
        reports_format_differences=policy.reports_format_differences,
    )


def build_entity_extraction_pipeline() -> EntityExtractionPipeline:
    # Orden de prioridad (ADR 010): primero los valores con etiqueta explícita, luego los que
    # podrían contener a otros (una fecha contiene un mes) y al final los nombres.
    return EntityExtractionPipeline(
        [
            TaxIdExtractor(),
            ContractIdExtractor(),
            DateExtractor(),
            MoneyExtractor(),
            PeriodExtractor(),
            OrganizationNameExtractor(),
            PersonNameExtractor(),
        ]
    )
