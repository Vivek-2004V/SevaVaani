# SEVA VAANI — Text-To-Speech Pronunciation, Ethics & Fine-Tuning Policy

## 1. Ethical Voice Principles
1. **Zero Voice Cloning**: SEVA VAANI strictly prohibits copying, cloning, or synthesizing the voice of any real citizen or official without formal written legal authorization.
2. **Honest Accent Declarations**: We do NOT claim that our text-to-speech voices exhibit "authentic native rural regional accents" (e.g. Vidarbha Varhadi, Malwi, Ahirani). They are honestly classified as **standard administrative voices** (Akashvani standard Hindi, Pune-standard Marathi, and neutral Indian English).
3. **No False Fine-Tuning Claims**: SEVA VAANI does not claim that its TTS models have undergone neural fine-tuning. Production synthesis relies on:
   - **Bhashini Indic TTS (ULCA)** cloud service for high-clarity Indian language synthesis.
   - **Browser SpeechSynthesis (hi-IN, mr-IN, en-IN)** native client-side fallback.

## 2. Intelligibility and Pronunciation Standards
- **Currency Phrasing**: Numeric amounts such as `₹2,00,000` are expanded into spoken words (*दो लाख रुपये* / *दोन लाख रुपये* / *two lakh rupees*) rather than read as symbols or raw digits.
- **District Gazetteers**: Administrative names (e.g. *Chhatrapati Sambhajinagar*, *Ahilyanagar*, *Dharashiv*) are mapped phonetically to avoid robotic mispronunciations.
- **Spaced Digit Readback**: Phone numbers are spaced into distinct 5-digit segments (`9 8 7 6 5, 4 3 2 1 0`) for calm citizen comprehension.

## 3. Pacing and Accessibility Controls
- **Default Speech Rate**: `0.92x` (measured calm cadence for senior citizens and low-literacy users).
- **Slower Playback**: `0.80x` accessible slow rate available on user request.
- **Playback Controls**: Full `replay`, `stop`, `pause`, and `resume` support across web and mobile.
- **Visual Transcript Synchronization**: Every spoken prompt is simultaneously printed on the screen so hearing-impaired users or noisy environments have full access.
- **Graceful Failure**: If speech output fails, the interface falls back to accessible high-contrast text without crashing.

## 4. Requirements for Future TTS Model Fine-Tuning
Before any neural TTS fine-tuning (e.g. Indic-Parler-TTS or VITS) is deployed:
1. Obtain explicit recorded consent from voice contributors.
2. Collect at least 10–20 hours of studio-quality 24kHz/48kHz phonetically balanced audio per dialect.
3. Conduct double-blind MOS (Mean Opinion Score) intelligibility tests with at least 50 native speakers.
4. Verify sub-250ms synthesis latency on commodity edge/server hardware.
