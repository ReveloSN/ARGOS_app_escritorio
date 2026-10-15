"""Construcción de las dependencias del motor: el único lugar que conoce los adaptadores."""

from argus.application.document_reader_factory import DocumentReaderFactory
from argus.domain.document import DocumentFormat
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
