from flask import Flask, render_template, request, send_file, jsonify
import io, os
from pdf2docx import Converter
from docx import Document
from reportlab.pdfgen import canvas
from PIL import Image

# --- Intentar importar MoviePy ---
try:
    from moviepy.editor import VideoFileClip
except Exception:
    VideoFileClip = None  # Evita error si Render no soporta moviepy

app = Flask(__name__)

# --- RUTA PRINCIPAL ---
@app.route('/')
def index():
    return render_template('index.html')

# --- RUTA DE CONVERSIÓN ---
@app.route('/convert', methods=['POST'])
def convert():
    if 'file' not in request.files:
        return "No se encontró el archivo", 400

    file = request.files['file']
    conversion_type = request.form.get('conversion_type', '').lower()
    to_extension = request.form.get('to_extension', '').lower()

    # --- PDF → DOCX ---
    if 'pdf' in conversion_type and 'docx' in to_extension:
        pdf_stream = io.BytesIO(file.read())
        temp_pdf = "temp_input.pdf"
        temp_docx = "output.docx"
        with open(temp_pdf, 'wb') as f:
            f.write(pdf_stream.getbuffer())

        cv = Converter(temp_pdf)
        cv.convert(temp_docx, start=0, end=None)
        cv.close()

        return send_file(temp_docx, as_attachment=True, download_name="convertido.docx")

    # --- DOCX → PDF ---
    elif 'docx' in conversion_type and 'pdf' in to_extension:
        doc = Document(file)
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer)
        y = 800
        for p in doc.paragraphs:
            c.drawString(50, y, p.text)
            y -= 20
            if y < 50:
                c.showPage()
                y = 800
        c.save()
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name="convertido.pdf", mimetype="application/pdf")

    # --- JPG → PNG ---
    elif 'jpg' in conversion_type and 'png' in to_extension:
        img = Image.open(file.stream)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name="convertido.png", mimetype="image/png")

    # --- PNG → JPG ---
    elif 'png' in conversion_type and 'jpg' in to_extension:
        img = Image.open(file.stream).convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name="convertido.jpg", mimetype="image/jpeg")

    # --- MP4 → MP3 ---
    elif 'mp4' in conversion_type and 'mp3' in to_extension:
        if VideoFileClip is None:
            # Render no soporta moviepy, se devuelve mensaje amigable
            return jsonify({
                "error": "Conversión de video no disponible en este entorno.",
                "detalle": "MoviePy no está instalado en el servidor."
            }), 501

        temp_input = "temp_video.mp4"
        temp_output = "output.mp3"
        with open(temp_input, 'wb') as f:
            f.write(file.read())

        clip = VideoFileClip(temp_input)
        clip.audio.write_audiofile(temp_output)
        clip.close()

        return send_file(temp_output, as_attachment=True, download_name="convertido.mp3")

    else:
        return "Conversión no soportada aún.", 400


if __name__ == '__main__':
    # Render usa Gunicorn, pero esto sirve localmente
    app.run(host='0.0.0.0', port=5000, debug=True)
