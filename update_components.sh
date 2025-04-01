#!/bin/bash
sed -i 's/TimelineMode.GifFrames/'"'"'gifFrames'"'"'/g' client/src/components/*.tsx
sed -i 's/TimelineMode.Animation/'"'"'animation'"'"'/g' client/src/components/*.tsx
chmod +x update_components.sh
./update_components.sh
