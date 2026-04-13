"""
CW DSP envelope extraction.
This file is the ONLY mutable file in the autoresearch loop.

Contract:
  - extract_envelope(audio, sample_rate, tone_freq) → np.ndarray shape (T, C)
  - T = len(audio) // 16  (decimation: 8000 Hz → 500 Hz)
  - C = number of channels (1–4, see constants.py)
  - Values must be in [0, 1], dtype float32
  - tone_freq is the CW carrier frequency in Hz (typically 400–900 Hz)
  - Dependencies: numpy, scipy only
"""
import numpy as np
from scipy.signal import butter, sosfiltfilt, hilbert


def extract_envelope(audio: np.ndarray, sample_rate: int = 8000,
                     tone_freq: float = 600.0) -> np.ndarray:
    """
    Two-channel envelope.

    ch0: bandpass + Hilbert magnitude → power-compress → percentile norm → sigmoid sharpen
    ch1: phase coherence (short-time |mean(unit phasor)|) — amplitude-invariant
         tone-presence indicator that fails differently from ch0 under QSB.
    """
    n_out = len(audio) // 16
    n = len(audio)

    # Bandpass ±22Hz around tone_freq.
    lo = max(tone_freq - 22, 1.0)
    hi = min(tone_freq + 22, sample_rate / 2 - 1)
    sos = butter(1, [lo, hi], btype="bandpass", fs=sample_rate, output="sos")
    bp = sosfiltfilt(sos, audio)

    # Analytic signal once, reused by ch0 (magnitude) and ch1 (phase).
    analytic = hilbert(bp)

    # ch0: amplitude envelope.
    mag = np.abs(analytic)
    ch0 = _decimate(mag, 16)[:n_out]
    ch0 = ch0 ** 0.69
    ch0 = _normalize(ch0)
    ch0 = _sharpen(ch0, gamma=37.0)

    # ch1: phase coherence.
    # Demodulate to baseband, normalize to unit phasor, short-time vector mean.
    # |mean(exp(jφ))| ∈ [0,1]: 1 when phase is coherent (tone present),
    # ~1/√N when phase is random (noise).
    t = np.arange(n) / sample_rate
    phasor = analytic * np.exp(-1j * 2 * np.pi * tone_freq * t)
    phasor /= np.abs(phasor) + 1e-12
    win = int(0.020 * sample_rate)  # 20 ms ≈ ½ dit at 25 WPM
    kernel = np.ones(win) / win
    coh = np.abs(
        np.convolve(phasor.real, kernel, mode="same")
        + 1j * np.convolve(phasor.imag, kernel, mode="same")
    )
    ch1 = _decimate(coh, 16)[:n_out]
    ch1 = _normalize(ch1)

    out = np.stack([ch0, ch1], axis=1).astype(np.float32)
    return out


def _decimate(x: np.ndarray, factor: int) -> np.ndarray:
    """Decimate by averaging blocks of `factor` samples."""
    n = len(x) // factor * factor
    return x[:n].reshape(-1, factor).mean(axis=1)


def _sharpen(x: np.ndarray, gamma: float = 2.0) -> np.ndarray:
    """Push values toward 0/1: x^g / (x^g + (1-x)^g). AUC-preserving."""
    xg = x ** gamma
    return xg / (xg + (1.0 - x) ** gamma + 1e-12)


def _normalize(env: np.ndarray) -> np.ndarray:
    """Normalize envelope to [0, 1] using global percentile noise floor.

    Global 17th percentile as noise floor is more stable than a running window:
    less clip at very_low SNR, better separation between tone-on and tone-off.
    """
    noise_floor = np.percentile(env, 22)
    signal_level = np.percentile(env, 84)
    denom = max(signal_level - noise_floor, 1e-10)
    return np.clip((env - noise_floor) / denom, 0.0, 1.0)
