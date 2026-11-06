# GaL

Syntax highlighting for GaL (`.gal`) files, and a command that runs Galimatron on the open `gal.cfg`.

## Coloring

A `.gal` file is colored as GaL: comments, strings, raw strings, keywords, numbers, names, and punctuation.

## Run Galimatron

Open `gal.cfg`, then run **Galimatron: execute** from the Command Palette.

The command needs `log.cfg` in the same directory as `gal.cfg`. It runs the galimatron executable with `--gal-config-file` and `--log-config-file`. The working directory is that folder.

When the extension starts, it looks for an installed executable and stores the path in **Galimatron: Executable** (`galimatron.executable`). On Windows that file is `galimatron.exe`, on `PATH` or in `Program Files\Galimatron\bin`. On Linux it is `galimatron`, on `PATH`, in `/usr/bin`, or in `/usr/local/bin`. A path that already points at a file is left as it is.

If nothing is found, the extension asks **Galimatron not found. Would you like to install it?** Yes opens the Galimatron project on GitHub. The question is asked once. If the path is still empty when you run the command, it asks you to pick the executable and stores that path.
