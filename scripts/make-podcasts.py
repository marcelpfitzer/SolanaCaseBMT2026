#!/usr/bin/env python3
"""Turns the podcast scripts in scripts/podcasts/*.txt into audio files (macOS only).

Each line looks like "SAM: text" or "DAN: text". Sam and Dan get different
text-to-speech voices; the lines are joined with short pauses and saved as
media/podcasts/<name>.m4a. Durations are written to media/podcasts/durations.json.

Run:  python3 scripts/make-podcasts.py
"""

import json
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts" / "podcasts"
OUT = ROOT / "media" / "podcasts"
VOICES = {"SAM": "Samantha", "DAN": "Daniel"}
RATE = 24000  # samples per second
PAUSE = 0.45  # seconds of silence between lines


def speak(voice: str, text: str, path: Path) -> None:
    subprocess.run(
        ["say", "-v", voice, "--file-format=WAVE", f"--data-format=LEI16@{RATE}", "-o", str(path), text],
        check=True,
    )


def build(script: Path) -> float:
    lines = [line.split(":", 1) for line in script.read_text().splitlines() if ":" in line]
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        combined = Path(tmp) / "episode.wav"
        with wave.open(str(combined), "wb") as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(RATE)
            for i, (speaker, text) in enumerate(lines):
                part = Path(tmp) / f"{i}.wav"
                speak(VOICES[speaker.strip()], text.strip(), part)
                with wave.open(str(part)) as w:
                    out.writeframes(w.readframes(w.getnframes()))
                out.writeframes(b"\x00\x00" * int(RATE * PAUSE))
        with wave.open(str(combined)) as w:
            seconds = w.getnframes() / RATE
        target = OUT / f"{script.stem}.m4a"
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", str(combined), str(target)], check=True)
    return seconds


def main() -> None:
    durations = {}
    for script in sorted(SCRIPTS.glob("*.txt")):
        durations[script.stem] = round(build(script))
        print(f"{script.stem}: {durations[script.stem]} s")
    (OUT / "durations.json").write_text(json.dumps(durations, indent=2) + "\n")


if __name__ == "__main__":
    main()
