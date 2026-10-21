from pathlib import Path

import noisereduce
import numpy as np
from pydub import AudioSegment, silence


def compress_wav_to_mp3(wav_path, mp3_path=None):
    wav_path = Path(wav_path)
    if wav_path.suffix.lower() != ".wav":
        raise ValueError("input audio must be a WAV file")
    if not wav_path.is_file():
        raise FileNotFoundError(f"WAV file not found: {wav_path}")

    output_path = Path(mp3_path) if mp3_path else wav_path.with_suffix(".mp3")
    if output_path.suffix.lower() != ".mp3":
        raise ValueError("output audio must use the .mp3 extension")
    if output_path.resolve() == wav_path.resolve():
        raise ValueError("input WAV and output MP3 paths must be different")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    audio = AudioSegment.from_wav(wav_path)
    if audio.channels != 1 or audio.sample_width != 2:
        audio = audio.set_channels(1).set_sample_width(2)
    if audio.dBFS == float("-inf"):
        raise ValueError("recording is silent")

    samples = np.asarray(audio.get_array_of_samples(), dtype=np.float32)
    denoised = noisereduce.reduce_noise(
        y=samples,
        sr=audio.frame_rate,
        stationary=True,
        prop_decrease=0.8,
    )
    denoised = np.clip(np.rint(denoised), -32768, 32767).astype(np.int16)
    cleaned = AudioSegment(
        data=denoised.tobytes(),
        sample_width=2,
        frame_rate=audio.frame_rate,
        channels=1,
    )

    nonsilent_parts = silence.split_on_silence(
        cleaned,
        min_silence_len=700,
        silence_thresh=max(-65, cleaned.dBFS - 16),
        keep_silence=300,
    )
    if not nonsilent_parts:
        raise ValueError("no speech or other non-silent audio was detected")

    compressed = sum(nonsilent_parts, AudioSegment.empty())
    compressed.export(output_path, format="mp3", bitrate="128k")
    return output_path
