#!/bin/bash
sed -i 's/TimelineMode.GifFrames/'"'"'gifFrames'"'"'/g' client/src/App.tsx
sed -i 's/TimelineMode.Animation/'"'"'animation'"'"'/g' client/src/App.tsx
chmod +x update_app.sh
./update_app.sh
