"""Synthese vocale hors ligne pour le feedback."""

from __future__ import annotations

import queue
import threading
import time

import config

try:
    import pyttsx3
except ModuleNotFoundError:  # pragma: no cover - dependance optionnelle
    pyttsx3 = None


class VoiceFeedback:
    """Gere une file de messages TTS dans un thread dedie."""

    def __init__(self, actif: bool = True) -> None:
        self.actif = bool(actif) and pyttsx3 is not None
        self.cooldown_sec = config.TTS_COOLDOWN_SEC
        self._queue: queue.Queue[str] = queue.Queue()
        self._stop_event = threading.Event()
        self._dernier_message = ""
        self._dernier_temps = 0.0
        self._thread: threading.Thread | None = None

        if self.actif:
            self._thread = threading.Thread(target=self._boucle, daemon=True)
            self._thread.start()

    def dire(self, message: str, force: bool = False) -> None:
        if not self.actif:
            return
        message = message.strip()
        if not message:
            return

        maintenant = time.monotonic()
        if not force and (maintenant - self._dernier_temps) < self.cooldown_sec:
            return
        if not force and message == self._dernier_message:
            return

        self._dernier_message = message
        self._dernier_temps = maintenant
        self._queue.put(message)

    def _boucle(self) -> None:
        if pyttsx3 is None:
            return
        moteur = pyttsx3.init()
        moteur.setProperty("rate", 185)

        while not self._stop_event.is_set():
            try:
                message = self._queue.get(timeout=0.2)
            except queue.Empty:
                continue
            try:
                moteur.say(message)
                moteur.runAndWait()
            except Exception:
                continue

        try:
            moteur.stop()
        except Exception:
            return

    def fermer(self) -> None:
        if not self.actif:
            return
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
