# CW Model — Streaming Morse Code Decoder

4-channel DSP → Causal CNN + TCN + BiGRU + CTC → streaming text output.

> Shape facts below track the committed `checkpoints/best.yaml` (Phase 4c,
> 4-channel). Trust `best.yaml` over prose for the exact shipped model.

## Architecture

**DSP** (`data/dsp.py`): 4-channel orthogonal envelope.
- Synced from `../cw-dsp-research/dsp.py` (autoresearch, ~0.87 composite score)
- ch0 amplitude (±25 Hz bandpass → Hilbert), ch1 TKEO, ch2 dit-scale matched
  filter (~48 ms), ch3 char-scale matched filter (~200 ms) → decimate 16× → 500 Hz
- per-channel percentile normalize → sigmoid sharpen (γ=8, applied twice)

**Model** (`model/cwnet.py`):
- Input: `(B, T, 4)` at 500 Hz
- Causal CNN: stride-2 at L1 → 250 Hz feature stream
- Causal TCN: 5 blocks (per `best.yaml`), dilations 1/2/4/8/16, receptive field ~120ms
- Chunked BiGRU: fwd stateful (WPM context), bwd 200ms lookahead (element boundaries)
- CTC head: 42 classes (blank + A–Z + 0–9 + `.,?=/`)
- CHUNK_FRAMES=100, LOOKAHEAD_FRAMES=50 → **~275ms algorithmic latency**
- ~880k params, ~3.8 MB ONNX

**ONNX export** — two graphs:
- `scripts/export_full_onnx.py` — **what the web app ships.** Fixed-length
  full-sequence: `envelopes (1, 8000, 4)` → `log_probs (1, 4000, 42)`. Client
  zero-pads the clip, runs once, trims to the real length.
- `scripts/export_onnx.py` — streaming chunk graph with explicit hidden-state
  I/O: `envelopes (1,150,4)` + `fwd_hidden (2,1,128)` → `log_probs (1,50,42)` +
  `fwd_hidden_next`. Not currently shipped.

## Key Design Decisions

**Anti-hallucination** (vs cw-decode which hallucinated at -12/-18 dB):
- `entropy_weight=0.03` (was 0.01) — penalize confident wrong predictions
- `ce_blank_weight=0.2` (was 0.5), `ce_char_weight=3.0` (was 2.0)
- Eval decoding: entropy gate + blank-ratio gate + run-length filter

**4-channel DSP**: orthogonal physics — amplitude (ch0), TKEO (ch1), and matched
filters at dit (ch2) and character (ch3) time scales. The aux channels add
independent tone-presence information (measured as `info_gain` in the research
loop) that the CNN fuses; this superseded the earlier single-channel design.

**Reduced SNR very-low tier** (25% vs 40%): Over-training on near-noise-floor conditions (-18 to -10 dB) teaches the model to hallucinate. Balanced distribution gives better real-world CER.

## Quick Start

```bash
# Install
uv sync                # Python deps (uv auto-selects Python 3.12 via .python-version)
bun install            # for morse-audio (WAV generator); run from repo root

# Smoke test (CPU)
uv run python main.py pipeline --config configs/debug.yaml

# Full run (RunPod)
uv run python launch-runpod.py --config configs/base.yaml

# Decode a WAV
uv run python main.py decode --config configs/base.yaml \
    --checkpoint runs/.../base_best.pt --wav audio.wav --freq 700
```

## Training Loop

CE pre-training (5 epochs) → blend CE+CTC (3 epochs) → CTC + entropy (60 epochs).
Best checkpoint saved when val CER improves during CTC phase.

## Verification

After training (all via `uv run`):
1. `uv run python main.py verify --config configs/debug.yaml` — smoke test
2. `uv run python main.py evaluate --config configs/base.yaml --checkpoint runs/.../base_best.pt`
3. `uv run python scripts/export_full_onnx.py --checkpoint runs/.../base_best.pt --config configs/base.yaml` — export the shipped full-sequence graph and check shapes
