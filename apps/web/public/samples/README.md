# Drum Samples

This directory must contain CC0-licensed audio samples before the studio engine can produce drum sounds.

## Required files

| Filename      | Description                              |
|---------------|------------------------------------------|
| `kick.wav`    | Kick drum — punchy, sub-heavy            |
| `snare.wav`   | Snare — lo-fi / rimshot style            |
| `hat.wav`     | Hi-hat — closed, slightly dull           |
| `vinyl.mp3`   | Vinyl crackle loop — very low amplitude  |
| `demo.wav`    | Optional: demo track for the track page  |

## Finding CC0 samples

- [Freesound.org](https://freesound.org) — filter by CC0 license
- [Looperman](https://www.looperman.com) — free loops, check individual licenses
- [SampleSwap](https://sampleswap.org) — large free library
- [Drum Kit — CC0 drum samples](https://github.com/nicowillis/cc0-drum-kit) (GitHub)

For licensing guidance and research notes, see `docs/research/samples-licensing.md`
(to be created in the monorepo root docs/ directory).

## Expected format

- **WAV**: 44100 Hz, 16-bit, mono or stereo
- **MP3**: 128 kbps minimum for vinyl.mp3
- Keep samples short (kick/snare/hat < 1s; vinyl crackle loop 5–30s)

> NOTE: Placeholder URLs like `/samples/kick.wav` will 404 silently until real
> files are added. The engine handles missing samples gracefully — audio context
> stays alive, just no drum hits.
