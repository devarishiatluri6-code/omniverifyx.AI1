import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

def send_hall_ticket_email(to_email: str, candidate_name: str, hall_ticket_number: str, pdf_path: str) -> tuple:
    """
    Sends the hall ticket PDF to the candidate email using SMTP.
    Returns (success_bool, message_str or error_str).
    """
    from dotenv import load_dotenv
    load_dotenv()

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port_str = os.environ.get("SMTP_PORT", "587")
    smtp_port = int(smtp_port_str) if smtp_port_str.isdigit() else 587
    smtp_username = os.environ.get("SMTP_USERNAME", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    smtp_from_email = os.environ.get("SMTP_FROM_EMAIL", smtp_username)

    if not smtp_username or not smtp_password:
        err_msg = "SMTP credentials not configured in environment variables (.env)"
        print(err_msg)
        return False, err_msg

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_from_email
        msg["To"] = to_email
        msg["Subject"] = f"OmniVerifyX AI Hall Ticket - {hall_ticket_number}"

        body = f"""Dear {candidate_name},

Your enrollment has been completed successfully.

Your Hall Ticket Number is: {hall_ticket_number}

Please find your hall ticket attached as a PDF.

You must use this hall ticket number for exam verification.

Regards,
OmniVerifyX AI"""

        msg.attach(MIMEText(body, "plain"))

        # Attach PDF
        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={os.path.basename(pdf_path)}",
                )
                msg.attach(part)
        else:
            err_msg = f"PDF attachment not found at path: {pdf_path}"
            print(err_msg)
            return False, err_msg

        # Connect and send
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from_email, to_email, msg.as_string())
        server.quit()
        return True, "Email sent successfully"
    except Exception as e:
        err_str = str(e)
        print(f"Failed to send email: {err_str}")
        return False, err_str
