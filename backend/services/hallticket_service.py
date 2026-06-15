import os
import json
import random
import uuid
import qrcode
from datetime import datetime
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from models import HallTicket, User

def generate_hall_ticket_for_candidate(db: Session, user: User, exam_details: dict) -> tuple:
    """
    Generates a hall ticket number, creates the database record,
    generates a QR code, generates the official PDF, and returns (hall_ticket_number, pdf_path).
    """
    # 1. Generate unique hall ticket number: OVX-{YEAR}-{RANDOM6}
    year = datetime.utcnow().year
    hall_ticket_number = None
    for _ in range(10):
        random_digits = "".join([str(random.randint(0, 9)) for _ in range(6)])
        temp_num = f"OVX-{year}-{random_digits}"
        existing = db.query(HallTicket).filter(HallTicket.hall_ticket_number == temp_num).first()
        if not existing:
            hall_ticket_number = temp_num
            break
    
    if not hall_ticket_number:
        random_digits = "".join([str(random.randint(0, 9)) for _ in range(6)])
        hall_ticket_number = f"OVX-{year}-{random_digits}"

    # 2. Check if a ticket already exists for this candidate & exam to maintain backward compatibility
    existing_ticket = db.query(HallTicket).filter(
        HallTicket.user_id == user.user_id,
        HallTicket.exam_id == exam_details.get("exam_id"),
        HallTicket.status == "active"
    ).first()
    
    if existing_ticket:
        hall_ticket_number = existing_ticket.hall_ticket_number
        ticket = existing_ticket
    else:
        # Create new database record
        ticket = HallTicket(
            hall_ticket_number=hall_ticket_number,
            candidate_uuid=user.candidate_uuid,
            user_id=user.user_id,
            exam_id=exam_details.get("exam_id"),
            candidate_name=user.name,
            candidate_email=user.email,
            exam_name=exam_details.get("exam_name"),
            exam_date=exam_details.get("exam_date"),
            start_time=exam_details.get("start_time"),
            duration_minutes=exam_details.get("duration_minutes", 10),
            status="active",
            generated_at=datetime.utcnow()
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

    # 3. Setup directories
    QR_DIR = "generated_hall_tickets/qr"
    PDF_DIR = "generated_hall_tickets/pdf"
    os.makedirs(QR_DIR, exist_ok=True)
    os.makedirs(PDF_DIR, exist_ok=True)

    qr_path = os.path.join(QR_DIR, f"{hall_ticket_number}.png")
    pdf_path = os.path.join(PDF_DIR, f"{hall_ticket_number}.pdf")

    # 4. Generate QR Code
    qr_payload = {
        "hall_ticket_number": hall_ticket_number,
        "candidate_uuid": user.candidate_uuid,
        "candidate_name": user.name,
        "candidate_email": user.email,
        "exam_id": exam_details.get("exam_id"),
        "status": "active"
    }
    qr_data = json.dumps(qr_payload)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_img.save(qr_path)

    # 5. Check face and voice enrollment status
    face_exists = os.path.exists(f"embeddings/{user.user_id}.json")
    voice_exists = (
        os.path.exists(f"voice_samples/{user.user_id}.wav") or
        os.path.exists(f"voice_samples/{user.user_id}.webm") or
        os.path.exists(f"voice_samples/{user.user_id}.mp3") or
        bool(user.voice_path and os.path.exists(user.voice_path))
    )

    # 6. Generate PDF using ReportLab
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    story = []
    styles = getSampleStyleSheet()

    # Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#002B49'),
        alignment=1,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#555555'),
        alignment=1,
        spaceAfter=8
    )

    ticket_header_style = ParagraphStyle(
        'TicketHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#222222'),
        alignment=1,
        spaceAfter=10
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#002B49'),
        spaceBefore=10,
        spaceAfter=4
    )

    label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#333333')
    )

    value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#000000')
    )

    instruction_style = ParagraphStyle(
        'InstructionText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#444444')
    )

    footer_style = ParagraphStyle(
        'FooterText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#777777'),
        alignment=1
    )

    # Title / Header
    story.append(Paragraph("OMNIVERIFYX AI", title_style))
    story.append(Paragraph("AI-Powered Examination Platform", subtitle_style))
    story.append(Paragraph("OFFICIAL HALL TICKET", ticket_header_style))
    
    # Horizontal line
    line_table = Table([[""]], colWidths=[486], rowHeights=[2])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#002B49')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 10))

    # Candidate details
    story.append(Paragraph("1. Candidate Details", section_heading_style))
    candidate_data = [
        [Paragraph("Hall Ticket Number:", label_style), Paragraph(hall_ticket_number, value_style)],
        [Paragraph("Candidate Name:", label_style), Paragraph(user.name or "N/A", value_style)],
        [Paragraph("Candidate Email:", label_style), Paragraph(user.email or "N/A", value_style)],
        [Paragraph("Candidate UUID:", label_style), Paragraph(user.candidate_uuid or "N/A", value_style)],
        [Paragraph("Date of Birth:", label_style), Paragraph(user.date_of_birth or "N/A", value_style)],
        [Paragraph("Category:", label_style), Paragraph(user.category or "N/A", value_style)],
    ]
    candidate_table = Table(candidate_data, colWidths=[130, 356])
    candidate_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(candidate_table)
    story.append(Spacer(1, 8))

    # Exam details
    story.append(Paragraph("2. Exam Details", section_heading_style))
    exam_data = [
        [Paragraph("Exam Name:", label_style), Paragraph(exam_details.get("exam_name", "N/A"), value_style)],
        [Paragraph("Exam ID:", label_style), Paragraph(exam_details.get("exam_id", "N/A"), value_style)],
        [Paragraph("Exam Date:", label_style), Paragraph(exam_details.get("exam_date", "N/A"), value_style)],
        [Paragraph("Start Time:", label_style), Paragraph(exam_details.get("start_time", "N/A"), value_style)],
        [Paragraph("Duration:", label_style), Paragraph(f"{exam_details.get('duration_minutes', 10)} Minutes", value_style)],
        [Paragraph("Exam Mode:", label_style), Paragraph("Online AI Proctored", value_style)],
    ]
    exam_table = Table(exam_data, colWidths=[130, 356])
    exam_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(exam_table)
    story.append(Spacer(1, 8))

    # Verification status
    doc_status = "Pending"
    if user.document_verification_status in ["VERIFIED", "PASS"]:
        doc_status = "Completed"
    elif user.document_verification_status == "MANUAL_REVIEW":
        doc_status = "Manual Review"

    story.append(Paragraph("3. Verification Status", section_heading_style))
    status_data = [
        [Paragraph("Document Verification:", label_style), Paragraph(doc_status, ParagraphStyle('DocVerifyStatus', parent=value_style, textColor=colors.HexColor('#155724') if doc_status == "Completed" else (colors.HexColor('#856404') if doc_status == "Manual Review" else colors.HexColor('#721c24')), fontName='Helvetica-Bold'))],
        [Paragraph("Face Enrollment:", label_style), Paragraph("✓ Completed" if face_exists else "✗ Pending", ParagraphStyle('GreenFace', parent=value_style, textColor=colors.HexColor('#155724') if face_exists else colors.HexColor('#721c24'), fontName='Helvetica-Bold' if face_exists else 'Helvetica'))],
        [Paragraph("Voice Enrollment:", label_style), Paragraph("✓ Completed" if voice_exists else "✗ Pending", ParagraphStyle('GreenVoice', parent=value_style, textColor=colors.HexColor('#155724') if voice_exists else colors.HexColor('#721c24'), fontName='Helvetica-Bold' if voice_exists else 'Helvetica'))],
        [Paragraph("Liveness Required:", label_style), Paragraph("Yes", ParagraphStyle('BlueLiveness', parent=value_style, textColor=colors.HexColor('#004085'), fontName='Helvetica-Bold'))],
    ]
    status_table = Table(status_data, colWidths=[130, 356])
    status_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(status_table)
    story.append(Spacer(1, 8))

    # Security & QR
    story.append(Paragraph("4. Security & Authentication", section_heading_style))
    security_details = [
        [Paragraph("Status:", label_style), Paragraph("ACTIVE", ParagraphStyle('StatusStyle', parent=value_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#155724')))],
        [Paragraph("Generated At:", label_style), Paragraph(ticket.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC') if ticket.generated_at else datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'), value_style)],
        [Paragraph("Verify authenticity via QR Code on the right.", ParagraphStyle('InfoText', parent=value_style, fontName='Helvetica-Oblique', fontSize=8.5, textColor=colors.HexColor('#666666')))]
    ]
    security_left_table = Table(security_details, colWidths=[110, 230])
    security_left_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))

    qr_image = Image(qr_path, width=80, height=80)
    security_combined_data = [
        [security_left_table, qr_image]
    ]
    security_table = Table(security_combined_data, colWidths=[356, 130])
    security_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'CENTER'),
    ]))
    story.append(security_table)
    story.append(Spacer(1, 8))

    # Instructions
    story.append(Paragraph("Important Instructions for Candidates", section_heading_style))
    instructions = [
        "1. Login 30 minutes before exam.",
        "2. Camera must remain enabled.",
        "3. Microphone must remain enabled.",
        "4. Face verification is mandatory.",
        "5. Voice verification is mandatory.",
        "6. Liveness verification is mandatory.",
        "7. Mobile phones are prohibited.",
        "8. Multiple faces are prohibited.",
        "9. Suspicious activity will be logged."
    ]
    for inst in instructions:
        story.append(Paragraph(inst, instruction_style))

    story.append(Spacer(1, 15))

    # Footer
    footer_line_table = Table([[""]], colWidths=[486], rowHeights=[1])
    footer_line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(footer_line_table)
    story.append(Spacer(1, 5))
    story.append(Paragraph("Generated by OmniVerifyX AI &bull; Secure Examination System", footer_style))

    # Build PDF
    doc.build(story)

    return hall_ticket_number, pdf_path
