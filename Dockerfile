# Innovation & R&D Center — landing page + two self-contained Three.js
# experiences: linear (Counter-drone C-UAS) and simulation-figures (heat-strain
# wearable in the zoned floor plan). Fully static — vendored three.js, procedural
# audio, pre-rendered voiceover. No build step, no API: just serve with nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
EXPOSE 46750
