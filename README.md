# RoF Bildstudio 2

Privater Foto-Editor für Realm of Fragrance – aufgebaut wie eine moderne Foto-App, aber ohne Cloud, ohne Konto und ohne Abo.

## Datenschutz
- Fotos werden ausschließlich im Browser auf deinem Gerät bearbeitet. Kein Upload, keine KI-Cloud.
- Keine externen Skripte, Schriften oder Tracker (per Content-Security-Policy technisch gesperrt).
- Beim Export werden Metadaten wie GPS-Ort und Kameradaten entfernt.
- Projekte liegen nur im Speicher dieses Browsers und lassen sich in „Ich“ löschen.
- Funktioniert nach dem ersten Laden auch offline (Home-Bildschirm-App).

## Funktionen
- **Vorlagen:** 18 Kombi-Looks (z. B. Handy 2013, Flakon-Glanz, Polaroid, Y2K Glitzer)
- **Filter:** 99 Filter in 17 Kategorien inkl. Film-Simulation, Stärke-Regler, Favoriten
- **Anpassen:** Zuschnitt (frei/Formate, Drehen, Begradigen, Perspektive), Selektiv, Auto, Glanz, Licht, Blitz, Brillanz, HSL, Kurven und 20 weitere Regler
- **Retusche:** Glätten, Fleck entfernen, Aufhellen, Abdunkeln, Glanzlicht, Schärfen, Weichzeichnen, Sättigen, Wärmer
- **Radieren:** Objekte entfernen (lokales Inpainting), Kopierstempel, Mosaik, Unkenntlich
- **Effekte:** 39 Effekte (Unschärfe, Licht, Glitzer/Kira, Camcorder/VHS, Farbversatz, Riffelglas …)
- **Zeichnen:** Stift, Marker, Neon, Muster- und Text-Pinsel, Pipette
- **Sticker, Text, Formen:** frei verschieben, drehen, skalieren; Bewertungssterne und Review-Sticker
- **Freistellen:** automatisch (ruhiger Hintergrund), Zauberstab, Pinsel
- **Überlagern:** eigene Fotos oder Licht-Ebenen mit Mischmodi
- **Hintergrund:** Formate wie 1:1, 9:16, 1200×630 mit Weich-, Spiegel-, Farb- oder Verlaufsfüllung
- **Verformen**, **Rahmen** (Polaroid, Film, Galerie, Briefmarke …)
- **Qualität:** HD 2× und Detail+ beim Export
- **Export:** JPG, WebP, PNG; Teilen/In Fotos sichern; **Stapel** (gleiche Bearbeitung auf viele Fotos, ZIP)
- **Collage** mit Layouts, Rändern und Formaten
- Rückgängig/Wiederholen, Vorher-Vergleich, Zoom mit zwei Fingern

## Technik
Reines HTML/CSS/JavaScript ohne Abhängigkeiten. Läuft auf GitHub Pages. **GitHub Pages veröffentlicht aus dem Zweig `gh-pages`.** Änderungen immer auch dorthin bringen (`main` und `gh-pages` gleich halten). Dateien:
`index.html`, `css/app.css`, `js/*.js`, `sw.js` (Offline-Cache), `manifest.json`.

## RoF WebP (Unterseite `webp/`)
Eigener WebP-Konverter, weil Safari auf dem iPad selbst kein WebP speichern kann.
- Adresse: `…/RoF-bildstudio/webp/`, lässt sich einzeln auf den Home-Bildschirm legen.
- Größe „Für WordPress“: längste Seite höchstens 2560 Pixel, damit WordPress nicht selbst verkleinert. Oder Originalgröße.
- Qualität „Sehr hoch“ (WebP 92, sichtbar verlustfrei) oder „Verlustfrei“ (pixelgenau, oft größere Dateien).
- Mehrere Bilder auf einmal, Teilen/Sichern oder als Datei laden. Metadaten (z. B. GPS) werden entfernt.
- Kodierung lokal mit libwebp als WebAssembly aus jSquash (Apache-2.0, siehe `webp/LICENSE-jsquash.txt`).
- Später geplant: JPEG XL, sobald WordPress `.jxl` annimmt.

## RoF Pins (Unterseite `pin/`)
Setzt Text im RoF-Design auf Stimmungsbilder für Pinterest. Version 4.
- Adresse: `…/RoF-bildstudio/pin/`, lässt sich einzeln auf den Home-Bildschirm legen.
- Vorschau immer sichtbar, Menüleiste unten (Vorlagen, Text, Stil, Foto), die Seite scrollt nie. iPad quer: Bedienung rechts.
- **WERBUNG im Bild:** Jeder Pin trägt oben links ein gut lesbares „WERBUNG“ (dunkles Milchglas, cremeweiße Schrift), immer an derselben Stelle. Inhalte oben links rücken darunter. Abschaltbar im Reiter „Text“, nur für Pins zu Artikeln ohne Affiliate-Link. Grund: Pinterest zeigt im Feed keine Beschreibung und vom Titel oft nichts, nur das Bild ist vor dem Klick sicher sichtbar.
- 25 Vorlagen in vier Gruppen: Auf dem Foto (11), Mit Fläche (8), Papierseite (6).
- Text verschieben: Alle Vorlagen „Auf dem Foto“ sowie Etikett, Notiz und Spalte. Text mit dem Finger ziehen, „Position automatisch“ setzt zurück. Bei den übrigen steht der Text fest auf seiner Fläche.
- Foto ziehen für den Ausschnitt, zwei Finger zum Zoomen. Hilfslinien rasten mittig ein.
- Titel mit eigenen Zeilenumbrüchen (Enter). Zahlen bleiben beim folgenden Wort.
- Flächen: Off-White, Off-White Papier, Petrol, Braun, Braun Papier (Papier = dezente Papierstruktur).
- Textgröße 80 bis 130 %: wirkt immer; größer darf bis zu zwei Zeilen mehr belegen.
- Schatten hinter dem Text werden stufenlos aus der Bildhelligkeit berechnet (Ziel: Kontrast mindestens 4,5 : 1).
- Ausgabe: JPEG mit Qualität 100 %, 2000 × 3000 oder 1000 × 1500 (2:3). Teilen/In Fotos sichern oder als Datei laden.
- Texte und Einstellungen bleiben in diesem Browser gespeichert, Fotos nicht.
- Schriften lokal im Ordner `pin/fonts/` (Playfair Display, Jost, Cormorant Garamond, SIL Open Font License, siehe `pin/fonts/LICENSE-OFL.txt`).
- Kein Upload, keine externen Skripte oder Schriften.
