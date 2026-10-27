import io
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.schemas.reports import ReportMetadata

def escape_pdf_text(text: Any) -> str:
    r"""
    Escapes special characters in PDF literal string literals:
    backslash (\), opening parenthesis ((), and closing parenthesis ()).
    Replaces non-ASCII or unprintable control characters with safe approximations.
    """
    if text is None:
        return ""
    s = str(text)
    # Filter non-printable ASCII
    clean_chars = []
    for ch in s:
        code = ord(ch)
        if 32 <= code <= 126:
            if ch in ("\\", "(", ")"):
                clean_chars.append("\\" + ch)
            else:
                clean_chars.append(ch)
        elif ch in ("\n", "\r", "\t"):
            clean_chars.append(" ")
        else:
            # Replace high unicode or non-ascii with safe character
            clean_chars.append("?")
    return "".join(clean_chars)

class PdfExporter:
    """
    Pure Python PDF-1.4 generation engine for executive summaries.
    Requires no external native C dependencies or compilers.
    Features:
    - AICTE institutional letterhead
    - Report metadata and filter criteria block
    - Structured tabular presentation with auto-paging
    - Formal regulatory footer and page numbering
    - Complete protection against PDF stream and text injection
    """

    @classmethod
    def generate_report_pdf(
        cls,
        headers: List[str],
        rows: List[List[Any]],
        metadata: ReportMetadata,
        max_rows: int = 150
    ) -> bytes:
        # Page geometry (A4 portrait: 595 x 842 points)
        page_width = 595
        page_height = 842
        margin_x = 40
        margin_y = 50
        content_width = page_width - (2 * margin_x)  # 515 points

        # Truncate for executive PDF summary
        display_rows = rows[:max_rows]
        is_pdf_truncated = len(rows) > max_rows

        # Calculate column widths
        num_cols = max(len(headers), 1)
        col_width = content_width / num_cols

        # Pagination setup: ~30 rows per page
        rows_per_first_page = 22  # First page has large header & metadata block
        rows_per_subsequent_page = 32

        pages_data: List[List[List[Any]]] = []
        if len(display_rows) <= rows_per_first_page:
            pages_data.append(display_rows)
        else:
            pages_data.append(display_rows[:rows_per_first_page])
            remaining = display_rows[rows_per_first_page:]
            for i in range(0, len(remaining), rows_per_subsequent_page):
                pages_data.append(remaining[i:i + rows_per_subsequent_page])

        total_pages = max(len(pages_data), 1)

        # PDF Object collection
        # Obj 1: Catalog
        # Obj 2: Pages root
        # Obj 3: Font Helvetica
        # Obj 4: Font Helvetica-Bold
        # Then for each page: Page object and Content stream object
        objects = []
        page_obj_ids = []

        # We will build page content streams
        page_streams = []

        for page_idx, page_rows in enumerate(pages_data, start=1):
            stream = []
            
            # --- HEADER ---
            if page_idx == 1:
                # Top Navy Accent Bar
                stream.append("0.08 0.20 0.42 rg")  # AICTE Dark Navy (#14336B)
                stream.append(f"{margin_x} 790 {content_width} 4 re f")

                # AICTE Title
                stream.append("BT /F2 13 Tf 1 1 1 rg")
                stream.append("0.12 0.23 0.45 rg")  # Text color
                stream.append(f"{margin_x} 770 Td (ALL INDIA COUNCIL FOR TECHNICAL EDUCATION [AICTE]) Tj ET")

                stream.append("BT /F1 9 Tf 0.35 0.35 0.35 rg")
                stream.append(f"{margin_x} 756 Td (SAMANVAY - Centralized Inter-Bureau Complaint Monitoring & Tracking System) Tj ET")

                # Report Title
                stream.append("BT /F2 12 Tf 0.08 0.20 0.42 rg")
                safe_title = escape_pdf_text(metadata.report_title)
                stream.append(f"{margin_x} 736 Td ({safe_title}) Tj ET")

                # Metadata Information Box
                stream.append("0.96 0.97 0.98 rg")  # Light gray background
                stream.append(f"{margin_x} 680 {content_width} 44 re f")
                stream.append("0.80 0.84 0.88 RG 0.5 w")
                stream.append(f"{margin_x} 680 {content_width} 44 re S")

                stream.append("BT /F1 8 Tf 0.25 0.25 0.25 rg")
                gen_date = metadata.generated_at.strftime("%Y-%m-%d %H:%M:%S UTC")
                safe_actor = escape_pdf_text(f"{metadata.generated_by} ({metadata.user_role} - {metadata.user_bureau or 'CENTRAL'})")
                filters_str = escape_pdf_text(str(metadata.selected_filters)[:90])
                stream.append(f"{margin_x + 8} 710 Td (Generated At: {gen_date}    |    Authorized Officer: {safe_actor}) Tj ET")
                stream.append(f"BT /F1 8 Tf 0.25 0.25 0.25 rg {margin_x + 8} 698 Td (Filters Applied: {filters_str}) Tj ET")
                stream.append(f"BT /F1 8 Tf 0.25 0.25 0.25 rg {margin_x + 8} 686 Td (Total Matched Records: {metadata.record_count}{' [Summary Display Bounded]' if is_pdf_truncated else ''}) Tj ET")

                table_top = 660
            else:
                # Subsequent Page Minimal Header
                stream.append("BT /F2 9 Tf 0.08 0.20 0.42 rg")
                safe_title = escape_pdf_text(metadata.report_title)
                stream.append(f"{margin_x} 800 Td (AICTE SAMANVAY - {safe_title} [Contd.]) Tj ET")
                stream.append("0.85 0.85 0.85 RG 0.5 w")
                stream.append(f"{margin_x} 792 {content_width} 0.5 re f")
                table_top = 780

            # --- TABLE HEADER ---
            row_height = 18
            header_y = table_top - row_height
            stream.append("0.08 0.20 0.42 rg")  # Navy table header
            stream.append(f"{margin_x} {header_y} {content_width} {row_height} re f")

            for c_idx, h_text in enumerate(headers):
                c_x = margin_x + (c_idx * col_width) + 4
                stream.append("BT /F2 8 Tf 1 1 1 rg")  # White bold text
                safe_h = escape_pdf_text(h_text)[:int(col_width / 5)]
                stream.append(f"{c_x} {header_y + 5} Td ({safe_h}) Tj ET")

            # --- TABLE ROWS ---
            curr_y = header_y
            for r_idx, row in enumerate(page_rows):
                curr_y -= row_height
                # Alternating row background
                if r_idx % 2 == 1:
                    stream.append("0.96 0.97 0.98 rg")
                    stream.append(f"{margin_x} {curr_y} {content_width} {row_height} re f")
                # Border line
                stream.append("0.88 0.90 0.92 RG 0.3 w")
                stream.append(f"{margin_x} {curr_y} {content_width} {row_height} re S")

                for c_idx, cell_val in enumerate(row):
                    if c_idx >= num_cols:
                        break
                    c_x = margin_x + (c_idx * col_width) + 4
                    stream.append("BT /F1 7.5 Tf 0.15 0.15 0.15 rg")
                    safe_val = escape_pdf_text(cell_val)[:int(col_width / 4.5)]
                    stream.append(f"{c_x} {curr_y + 5} Td ({safe_val}) Tj ET")

            # --- FOOTER ---
            stream.append("0.80 0.80 0.80 RG 0.5 w")
            stream.append(f"{margin_x} 38 {content_width} 0.5 re f")

            stream.append("BT /F1 7 Tf 0.45 0.45 0.45 rg")
            stream.append(f"{margin_x} 26 Td (CONFIDENTIAL - FOR OFFICIAL AICTE REGULATORY COMPLIANCE USE ONLY) Tj ET")
            
            stream.append("BT /F1 7 Tf 0.45 0.45 0.45 rg")
            stream.append(f"{page_width - margin_x - 60} 26 Td (Page {page_idx} of {total_pages}) Tj ET")

            page_streams.append("\n".join(stream).encode("latin-1", errors="replace"))

        # Assemble full PDF 1.4 stream
        # Object allocation:
        # 1: Catalog
        # 2: Pages
        # 3: Font Helvetica
        # 4: Font Helvetica-Bold
        # 5 .. : Page objs and Stream objs
        obj_count = 4 + (len(page_streams) * 2)
        xref_offsets = {}

        buf = io.BytesIO()
        buf.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

        # Obj 1: Catalog
        xref_offsets[1] = buf.tell()
        buf.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

        # Obj 2: Pages Root (we will fill Kids once IDs are determined)
        page_ids = [5 + (i * 2) for i in range(len(page_streams))]
        kids_str = " ".join([f"{pid} 0 R" for pid in page_ids])
        xref_offsets[2] = buf.tell()
        buf.write(f"2 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {len(page_streams)} >>\nendobj\n".encode("ascii"))

        # Obj 3: Font Helvetica
        xref_offsets[3] = buf.tell()
        buf.write(b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

        # Obj 4: Font Helvetica-Bold
        xref_offsets[4] = buf.tell()
        buf.write(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")

        # Page and Content objects
        for idx, p_stream in enumerate(page_streams):
            p_obj_id = 5 + (idx * 2)
            c_obj_id = p_obj_id + 1

            # Page obj
            xref_offsets[p_obj_id] = buf.tell()
            page_def = (
                f"{p_obj_id} 0 obj\n"
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_width} {page_height}] "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
                f"/Contents {c_obj_id} 0 R >>\nendobj\n"
            )
            buf.write(page_def.encode("ascii"))

            # Content stream obj
            xref_offsets[c_obj_id] = buf.tell()
            stream_header = f"{c_obj_id} 0 obj\n<< /Length {len(p_stream)} >>\nstream\n".encode("ascii")
            buf.write(stream_header)
            buf.write(p_stream)
            buf.write(b"\nendstream\nendobj\n")

        # Cross-reference table
        xref_start = buf.tell()
        total_objs = 4 + (len(page_streams) * 2) + 1
        buf.write(f"xref\n0 {total_objs}\n0000000000 65535 f \n".encode("ascii"))
        for obj_id in range(1, total_objs):
            offset = xref_offsets[obj_id]
            buf.write(f"{offset:010d} 00000 n \n".encode("ascii"))

        # Trailer
        trailer_str = (
            f"trailer\n<< /Size {total_objs} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        )
        buf.write(trailer_str.encode("ascii"))

        return buf.getvalue()
